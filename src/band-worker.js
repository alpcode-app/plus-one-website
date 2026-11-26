// +one Bandbereich auf Cloudflare Workers.
// Läuft nur für /band und /band/* (siehe assets.run_worker_first in wrangler.jsonc),
// alle anderen Seiten liefert Cloudflare wie bisher direkt als statische Dateien aus.
//
// Bindings:
//   ASSETS         statische Dateien der Webseite (Oberfläche liegt unter /band/)
//   BAND_FILES     KV: "songs.json" und "audio/<datei>" (privat, nicht im Git-Repo)
//   BAND_DB        D1: Tabelle notes (gemeinsame Ensemble-Notizen)
//   BAND_ACCOUNTS  Secret: JSON {login: {name, role, hash}} wie data/accounts.json

const PREFIX = '/band/';
const ROLES = ['Gesang', 'Saxophon', 'Keyboard', 'Gitarre', 'Bass', 'Drums'];
const STATIC = new Set(['', 'style.css', 'app.js']);
const SECURITY_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; media-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

function withHeaders(response, extra = {}) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries({...SECURITY_HEADERS, ...extra})) headers.set(name, value);
  return new Response(response.body, {status: response.status, headers});
}

function reply(status, value, extra = {}) {
  return new Response(JSON.stringify(value), {
    status, headers: {...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...extra},
  });
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function sameHex(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function accountFor(request, env) {
  const match = request.headers.get('Authorization')?.match(/^Basic ([A-Za-z0-9+/=]+)$/i);
  if (!match) return;
  let decoded;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(match[1]), c => c.charCodeAt(0)));
  } catch {
    return;
  }
  const colon = decoded.indexOf(':');
  if (colon < 0) return;
  const accounts = JSON.parse(env.BAND_ACCOUNTS || '{}');
  const entry = Object.hasOwn(accounts, decoded.slice(0, colon)) ? accounts[decoded.slice(0, colon)] : undefined;
  const supplied = await sha256Hex(decoded.slice(colon + 1));
  if (sameHex(entry?.hash ?? '0'.repeat(64), supplied) && entry) return entry;
}

async function catalogFor(env) {
  const catalog = await env.BAND_FILES.get('songs.json', {type: 'json', cacheTtl: 60});
  if (!catalog) throw new Error('songs.json fehlt im KV-Speicher.');
  const keys = new Set(catalog.songs.flatMap(song => song.sections.filter(section => section.start)
    .flatMap(section => ROLES.map((_, i) => [song.id, section.start, i].join(':')))));
  return {catalog, keys};
}

async function readNotes(env) {
  const {results} = await env.BAND_DB.prepare('SELECT key, text, version, by, at FROM notes').all();
  const notes = {};
  for (const row of results) notes[row.key] = {text: row.text, version: row.version, by: row.by, at: row.at};
  return notes;
}

async function readChanges(request, keys) {
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') throw new Error('Format');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 350000) throw new Error('Größe');
  const {changes} = JSON.parse(raw);
  if (!Array.isArray(changes) || !changes.length || changes.length > keys.size) throw new Error('Änderungen');
  const distinct = new Set();
  for (const change of changes) {
    if (!change || distinct.has(change.key) || !keys.has(change.key) ||
        !Number.isSafeInteger(change.version) || change.version < 0 ||
        typeof change.text !== 'string' || change.text.length > 500) throw new Error('Feld');
    distinct.add(change.key);
  }
  return changes;
}

async function saveChanges(changes, account, env) {
  const notes = await readNotes(env);
  const conflicts = changes.filter(change => change.version !== (notes[change.key]?.version ?? 0))
    .map(change => ({key: change.key, entry: notes[change.key] ?? null}));
  if (conflicts.length) return reply(409, {conflicts});
  const at = new Date().toISOString();
  const saved = {};
  // Nur schreiben, wenn die Version noch stimmt (falls jemand gleichzeitig speichert)
  const statements = changes.map(change => {
    saved[change.key] = {text: change.text, version: change.version + 1, by: account.name, at};
    return env.BAND_DB.prepare(
      `INSERT INTO notes (key, text, version, by, at) VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(key) DO UPDATE SET text = ?2, version = ?3, by = ?4, at = ?5 WHERE notes.version = ?3 - 1`,
    ).bind(change.key, change.text, change.version + 1, account.name, at);
  });
  const results = await env.BAND_DB.batch(statements);
  const late = changes.filter((_, i) => !results[i].meta.changes);
  if (late.length) {
    const fresh = await readNotes(env);
    for (const change of late) delete saved[change.key];
    return reply(409, {conflicts: late.map(change => ({key: change.key, entry: fresh[change.key] ?? null})), saved});
  }
  return reply(200, {saved});
}

function readRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return false;
  const [, first, last] = match;
  const start = first ? Number(first) : Math.max(0, size - Number(last));
  const end = first && last ? Math.min(Number(last), size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return false;
  return {start, end};
}

async function sendAudio(request, env, audioFile) {
  const data = await env.BAND_FILES.get('audio/' + audioFile, {type: 'arrayBuffer', cacheTtl: 3600});
  if (!data) return reply(404, {error: 'Audiodatei fehlt.'});
  const size = data.byteLength;
  const type = audioFile.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg';
  const range = readRange(request.headers.get('Range'), size);
  if (range === false) return reply(416, {error: 'Ungültiger Bereich.'}, {'Content-Range': 'bytes */' + size});
  const body = request.method === 'HEAD' ? null : (range ? data.slice(range.start, range.end + 1) : data);
  const headers = {...SECURITY_HEADERS, 'Content-Type': type, 'Accept-Ranges': 'bytes',
    'Content-Length': String(range ? range.end - range.start + 1 : size)};
  if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`;
  return new Response(body, {status: range ? 206 : 200, headers});
}

async function handleBand(request, env) {
  const url = new URL(request.url);
  if (url.pathname === PREFIX.slice(0, -1)) return Response.redirect(url.origin + PREFIX, 308);
  const account = await accountFor(request, env);
  if (!account) {
    return reply(401, {error: 'Band-Anmeldung erforderlich.'},
      {'WWW-Authenticate': 'Basic realm="Plus One Bandbereich", charset="UTF-8"'});
  }
  const route = url.pathname.slice(PREFIX.length);
  const read = request.method === 'GET' || request.method === 'HEAD';

  if (read && STATIC.has(route)) {
    const asset = await env.ASSETS.fetch(new Request(url.origin + PREFIX + route, {method: request.method}));
    return withHeaders(asset);
  }
  if (request.method === 'GET' && route === 'api/songs') {
    const {catalog} = await catalogFor(env);
    return reply(200, {...catalog, member: {name: account.name, role: account.role}});
  }
  if (request.method === 'GET' && route === 'api/ensemble') return reply(200, {notes: await readNotes(env)});
  if (request.method === 'PATCH' && route === 'api/ensemble') {
    if (request.headers.get('Origin') !== url.origin) return reply(403, {error: 'Ungültiger Ursprung.'});
    const {keys} = await catalogFor(env);
    let changes;
    try {
      changes = await readChanges(request, keys);
    } catch {
      return reply(400, {error: 'Ungültige Änderungen.'});
    }
    return saveChanges(changes, account, env);
  }
  if (read && route.startsWith('audio/')) {
    const {catalog} = await catalogFor(env);
    const song = catalog.songs.find(item => 'audio/' + item.audioFile === route);
    if (song) return sendAudio(request, env, song.audioFile);
  }
  return reply(404, {error: 'Seite nicht gefunden.'});
}

export default {
  async fetch(request, env) {
    const {pathname} = new URL(request.url);
    if (pathname !== '/band' && !pathname.startsWith(PREFIX)) return env.ASSETS.fetch(request);
    try {
      return await handleBand(request, env);
    } catch {
      return reply(500, {error: 'Der Server konnte die Anfrage nicht abschließen.'});
    }
  },
};
