'use strict';
const get = id => document.getElementById(id);
const audio = get('audio');
const seek = get('seek');
const roleNames = ['Gesang','Saxophon','Keyboard','Gitarre','Bass','Drums'];
const drafts = new Map();
const conflicts = new Map();
const songs = [];
const songButtons = new Map();
let defaults = {};
let entries = {};
let selectedRole = 0;
let song;
let active = -1;
let loop = null;
let saving = false;
let refreshing = false;
let frame = 0;
let queuedSeek = null;
const dateFormat = new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short'});

function element(tag,text,className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(label,action) {
  const node = element('button',label);
  node.type = 'button';
  node.addEventListener('click',action);
  return node;
}

function time(value) {
  const seconds = Math.max(0, Math.floor(value || 0));
  return Math.floor(seconds/60).toString().padStart(2,'0')+':'+(seconds%60).toString().padStart(2,'0');
}

function sectionAt(value) {
  const following = song.sections.findIndex(section => section.start > value);
  return following < 0 ? song.sections.length-1 : Math.max(0,following-1);
}

function updatePlayer(position = audio.currentTime) {
  if (!song) return;
  const index = sectionAt(position);
  if (active !== index) {
    active = index;
    const section = song.sections[index];
    const next = song.sections[index+1];
    get('current').textContent = section.name;
    get('chords').textContent = section.chords || '';
    get('next').textContent = next ? 'Als Nächstes · '+time(next.start)+' '+next.name : 'Letzter Abschnitt';
    get('back').disabled = index === 0;
    get('forward').disabled = index === song.sections.length-1;
    highlightRow();
  }
  const nearBreak = song.id === 'coffee' && position >= 258 && position < 268;
  get('cue').textContent = nearBreak ? 'Drum-Break im Übergang · ca. 04:22' : song.sections[index].cue || '';
  get('elapsed').textContent = time(position);
  seek.value = position;
}

function highlightRow() {
  for (const row of get('cues').tBodies[0]?.rows ?? []) {
    const isActive = Number(row.dataset.start) === song.sections[active]?.start;
    row.classList.toggle('active',isActive);
    const link = row.querySelector('button');
    if (isActive) link.setAttribute('aria-current','true');
    else link.removeAttribute('aria-current');
  }
}

function setLoop(index) {
  loop = index;
  get('loop').setAttribute('aria-pressed',String(index !== null));
}

function jump(position,keepLoop = false) {
  if (!keepLoop && loop !== null) setLoop(sectionAt(position));
  if (audio.readyState) audio.currentTime = position;
  else queuedSeek = position;
  updatePlayer(position);
}

function tick() {
  if (loop !== null && !audio.paused &&
      audio.currentTime >= (song.sections[loop+1]?.start ?? audio.duration)) {
    jump(song.sections[loop].start,true);
  }
  if (queuedSeek === null) updatePlayer();
}

async function play() {
  try {
    await audio.play();
    get('audio-status').textContent = '';
  } catch (error) {
    if (error.name !== 'AbortError') get('audio-status').textContent = 'Der Song konnte nicht gestartet werden.';
  }
}

function renderSongButtons() {
  if (!songButtons.size) {
    for (const item of songs) {
      const control = button(item.title,()=>selectSong(item));
      songButtons.set(item,control);
      get('songs').append(control);
    }
  }
  for (const [item,control] of songButtons) {
    control.setAttribute('aria-pressed',String(item === song));
  }
}

function selectSong(next) {
  if (song === next) return;
  song = next;
  audio.pause();
  audio.src = 'audio/'+song.audioFile;
  audio.playbackRate = Number(get('speed').value);
  queuedSeek = null;
  active = -1;
  setLoop(null);
  seek.max = song.duration;
  get('duration').textContent = time(song.duration);
  get('audio-status').textContent = '';
  get('track-meta').textContent = song.bpm+' BPM · '+song.meter+' · Originalaufnahme mit Saxophon';
  get('song-name').textContent = [song.title,song.subtitle].filter(Boolean).join(' · ');
  renderSongButtons();
  renderTable();
  updatePlayer(0);
}

get('play').addEventListener('click',()=>{if (audio.paused) void play(); else audio.pause();});
get('back').addEventListener('click',()=>jump(song.sections[Math.max(0,active-1)].start));
get('forward').addEventListener('click',()=>jump(song.sections[Math.min(song.sections.length-1,active+1)].start));
get('loop').addEventListener('click',()=>setLoop(loop === null ? active : null));
get('speed').addEventListener('change',()=>{audio.playbackRate = Number(get('speed').value);});
seek.addEventListener('input',()=>jump(Number(seek.value)));
audio.addEventListener('loadedmetadata',()=>{
  seek.max = audio.duration;
  get('duration').textContent = time(Math.round(audio.duration));
  if (queuedSeek !== null) {
    const requested = queuedSeek;
    queuedSeek = null;
    jump(requested);
  }
});
audio.addEventListener('timeupdate',tick);
audio.addEventListener('play',()=>{
  get('play').textContent = 'Pause';
  cancelAnimationFrame(frame);
  const animate = ()=>{
    tick();
    if (!audio.paused) frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);
});
audio.addEventListener('pause',()=>{
  cancelAnimationFrame(frame);
  get('play').textContent = 'Abspielen';
});
audio.addEventListener('ended',()=>{
  if (loop !== null) {
    jump(song.sections[loop].start,true);
    void play();
  }
});

async function api(route,options) {
  const response = await fetch('api/'+route,options);
  if (response.status === 401) throw new Error('Bitte öffne den Bandbereich erneut und melde dich an.');
  const body = await response.json();
  if (!response.ok && response.status !== 409) throw new Error(body.error || 'Abruf fehlgeschlagen.');
  return body;
}

function keyFor(section,index) {
  return [song.id,section.start,index].join(':');
}

function version(key) {
  return entries[key]?.version ?? 0;
}

function valueFor(key) {
  return entries[key]?.text ?? defaults[key] ?? '';
}

function setStatus(text) {
  get('edit-status').textContent = text;
}

function updateActions() {
  get('save').disabled = saving || refreshing || drafts.size === 0 || conflicts.size > 0;
  get('save').textContent = saving ? 'Wird gespeichert …' :
    drafts.size ? 'Änderungen speichern ('+drafts.size+')' : 'Änderungen speichern';
  get('reload').disabled = saving || refreshing;
}

function renderRoles() {
  const roleButtons = [...roleNames,'Alle Stimmen'].map((name,index)=>{
    const control = button(name,()=>{
      selectedRole = index;
      try {localStorage.setItem('plus-one.last-role',String(index));} catch {}
      renderRoles();
      renderTable();
    });
    control.setAttribute('aria-pressed',String(selectedRole===index));
    return control;
  });
  get('roles').replaceChildren(...roleButtons);
}

function grow(field) {
  field.style.height = 'auto';
  field.style.height = field.scrollHeight+2+'px';
}

function fieldFor(section,index) {
  const cell = element('td');
  cell.dataset.role = roleNames[index];
  const key = keyFor(section,index);
  const field = element('textarea');
  field.rows = selectedRole === roleNames.length ? 1 : 2;
  field.maxLength = 500;
  field.value = drafts.get(key)?.text ?? valueFor(key);
  field.dataset.dirty = String(drafts.has(key));
  field.disabled = saving;
  field.placeholder = 'Einsatz oder Notiz';
  field.setAttribute('aria-label',section.name+' · '+roleNames[index]);
  field.addEventListener('input',()=>{
    const previous = drafts.get(key);
    if (field.value === valueFor(key) && !conflicts.has(key)) drafts.delete(key);
    else drafts.set(key,{key,text:field.value,version:previous?.version ?? version(key)});
    field.dataset.dirty = String(drafts.has(key));
    grow(field);
    updateActions();
    if (!conflicts.size) setStatus(drafts.size ? 'Ungespeicherte Änderungen' : '');
  });
  const entry = entries[key];
  const info = element('p',entry ? entry.by+' · '+dateFormat.format(new Date(entry.at)) : '','field-meta');
  cell.append(field,info);
  return cell;
}

function renderTable() {
  if (!song) return;
  const table = get('cues');
  const wide = selectedRole === roleNames.length;
  table.dataset.wide = String(wide);
  get('workspace').classList.toggle('wide',wide);
  const indices = wide ? roleNames.map((_,index)=>index) : [selectedRole];
  const head = element('thead');
  const header = head.insertRow();
  for (const label of ['Songteil',...indices.map(index=>roleNames[index])]) {
    const cell = element('th',label);
    cell.scope = 'col';
    header.append(cell);
  }
  const body = element('tbody');
  for (const section of song.sections.filter(section=>section.start !== 0)) {
    const row = body.insertRow();
    row.dataset.start = section.start;
    const first = element('th');
    first.scope = 'row';
    const control = button(section.name,()=>jump(section.start));
    control.className = 'row-play';
    control.append(element('span',[time(section.start),section.bars ? section.bars+(typeof section.bars==='number'?' Takte':'') : ''].filter(Boolean).join(' · ')));
    first.append(control);
    row.append(first,...indices.map(index=>fieldFor(section,index)));
  }
  table.replaceChildren(head,body);
  highlightRow();
  requestAnimationFrame(()=>table.querySelectorAll('textarea').forEach(grow));
}

// Höhe der Player-Leiste für die feststehende Tabellenkopfzeile in „Alle Stimmen“
new ResizeObserver(()=>{
  document.documentElement.style.setProperty('--bar',get('player').offsetHeight+'px');
}).observe(get('player'));
window.addEventListener('resize',()=>get('cues').querySelectorAll('textarea').forEach(grow));

function describeKey(key) {
  const [id,start,role] = key.split(':');
  const track = songs.find(value=>value.id===id);
  return [track.title,track.sections.find(section=>section.start===Number(start)).name,roleNames[Number(role)]].join(' · ');
}

function resolveConflict(key,keep) {
  const entry = conflicts.get(key);
  if (entry) entries[key] = entry;
  else delete entries[key];
  if (keep) drafts.get(key).version = version(key);
  else drafts.delete(key);
  conflicts.delete(key);
  renderConflicts();
  renderTable();
  if (!conflicts.size) setStatus(drafts.size ? 'Die übrigen Änderungen können jetzt gespeichert werden.' : 'Gemeinsamer Stand übernommen.');
  updateActions();
}

function renderConflicts() {
  const panel = get('conflicts');
  panel.hidden = !conflicts.size;
  panel.replaceChildren();
  if (!conflicts.size) return;
  panel.append(element('strong','Diese Felder wurden gleichzeitig bearbeitet'));
  for (const [key,entry] of conflicts) {
    const item = element('div',undefined,'conflict');
    item.append(element('strong',describeKey(key)),
      element('p','Gemeinsam: '+(entry?.text ?? defaults[key] ?? '')),
      element('p','Dein Entwurf: '+drafts.get(key).text),
      button('Gemeinsamen Stand übernehmen',()=>resolveConflict(key,false)),
      button('Eigenen Entwurf behalten',()=>resolveConflict(key,true)));
    panel.append(item);
  }
}

async function save() {
  if (saving || !drafts.size || conflicts.size) return;
  saving = true;
  updateActions();
  renderTable();
  try {
    const result = await api('ensemble',{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({changes:[...drafts.values()]})});
    if (result.conflicts) {
      for (const {key,entry} of result.conflicts) conflicts.set(key,entry);
      renderConflicts();
      setStatus('Bitte löse die Konflikte. Deine Entwürfe sind weiterhin verfügbar.');
    } else {
      Object.assign(entries,result.saved);
      drafts.clear();
      setStatus('Für die Band gespeichert.');
    }
  } catch (error) {
    setStatus(error.message+' Deine Entwürfe sind weiterhin verfügbar.');
  } finally {
    saving = false;
    updateActions();
    renderTable();
  }
}

async function refresh() {
  if (saving || refreshing) return;
  refreshing = true;
  updateActions();
  try {
    entries = (await api('ensemble')).notes;
    renderTable();
    setStatus(drafts.size ? 'Gemeinsamer Stand aktualisiert. Deine Entwürfe sind erhalten.' : 'Gemeinsamer Stand aktualisiert.');
  } catch (error) {
    setStatus(error.message);
  } finally {
    refreshing = false;
    updateActions();
  }
}

get('save').addEventListener('click',()=>void save());
get('reload').addEventListener('click',()=>void refresh());
window.addEventListener('beforeunload',event=>{
  if (drafts.size) {event.preventDefault();event.returnValue='';}
});

async function initialize() {
  try {
    const [data,ensemble] = await Promise.all([api('songs'),api('ensemble')]);
    songs.push(...data.songs);
    defaults = data.defaults;
    entries = ensemble.notes;
    get('member').textContent = data.member.name;
    selectedRole = Math.max(0,roleNames.indexOf(data.member.role));
    try {
      const saved = localStorage.getItem('plus-one.last-role');
      if (saved !== null && /^[0-6]$/.test(saved)) selectedRole = Number(saved);
    } catch {}
    renderRoles();
    selectSong(songs[0]);
    get('workspace').hidden = false;
    get('startup').hidden = true;
  } catch (error) {
    get('startup').textContent = error.message;
  }
}
void initialize();
