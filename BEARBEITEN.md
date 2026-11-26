# Webseite bearbeiten – Anleitung für die Band

Die Seite **https://plus-one-kempten.de** besteht aus einfachen Dateien in diesem Repository.
Jede Änderung auf dem Branch `main` geht automatisch online (Cloudflare baut in ca. 1 Minute neu).

## Wer darf bearbeiten?

Alle, die als **Collaborator** eingeladen sind:
GitHub → `alpcode-app/plus-one-website` → **Settings → Collaborators → Add people** (macht Basti).
Ihr braucht nur ein kostenloses GitHub-Konto. Zugang zu Cloudflare oder zur Domain ist nicht nötig.

## Kleine Änderung direkt im Browser

1. Datei auf GitHub öffnen, z. B. `index.html`.
2. Oben rechts auf den **Stift** (Edit) klicken.
3. Ändern, dann **Commit changes** → kurze Beschreibung → **Commit changes**.
4. Ca. 1 Minute warten, dann https://plus-one-kempten.de neu laden.

Für mehrere Dateien auf einmal: auf der Repository-Seite die Taste **`.`** drücken. Dann öffnet sich ein Editor im Browser.

## Was steht wo?

| Was | Datei | Wo |
|---|---|---|
| Termine | `index.html` | Abschnitt `id="live"`: die Vorlage im Kommentar darüber kopieren, Datum/Titel/Ort anpassen. Solange es keine Termine gibt, steht dort die Karte `gig--empty` („Neue Termine folgen bald“), die beim ersten Termin entfernen |
| Bandgeschichte / Mitglieder | `index.html` | Abschnitt `id="band"` (Zeitstrahl `<ol class="timeline">`, Namen `<ul class="members">`) |
| Galerie | `index.html` + `assets/img/` | Bild hochladen (**Add file → Upload files**), dann einen `<button class="gallery__item">`-Block kopieren |
| Videos ein-/ausblenden | `index.html` | `<section … id="videos" hidden>`: `hidden` entfernen = sichtbar. Dann auch den Nav-Link „Videos“ und den YouTube-Abschnitt in `datenschutz.html` wieder einblenden |
| YouTube-Video einbinden | `index.html` | bei der Video-Kachel `data-yt="VIDEO-ID"` eintragen (ID = Teil nach `watch?v=`) |
| Social-Media-Links | `index.html` | Fußzeile, `<ul class="social">` |
| Impressum | `index.html` | Fußzeile, Abschnitt „Impressum“ |
| Datenschutz | `datenschutz.html` | bei neuen Diensten (z. B. Instagram-Einbettung) unbedingt ergänzen |
| Farben, Schriften, Abstände | `styles.css` | Farben ganz oben unter `:root` |

## Regeln

- **Erst absprechen, dann ändern.** Es gibt keine Freigabe-Schleife, jede Änderung ist sofort live.
- **Dateien unter 25 MB** (Cloudflare-Limit). Fotos vorher verkleinern (max. ~2000 px breit).
  Videos lieber auf YouTube, Anleitung zum Komprimieren steht in `README.md`.
- **Keine fremden Dienste einbauen** (Google Fonts, Instagram-Widgets, Tracking …) ohne die Datenschutzerklärung anzupassen.
- Nicht löschen: `wrangler.jsonc` und `.assetsignore`. Die sorgen dafür, dass nur die Webseite veröffentlicht wird.

## Etwas kaputt gemacht?

Kein Problem: Auf GitHub unter **Commits** die letzte funktionierende Version suchen.
Die Änderung über den Commit rückgängig machen oder Basti Bescheid geben. Alles ist versioniert, nichts geht verloren.

## Lokal ansehen (optional, für Fortgeschrittene)

```bash
git clone https://github.com/alpcode-app/plus-one-website.git
cd plus-one-website
npx http-server@14.1.1 -p 8080 .
```

## Interner Bandbereich (/band/)

Adresse: https://plus-one-kempten.de/band/ – Login pro Bandmitglied (Browser-Dialog).

| Teil | Wo |
|---|---|
| Programm (Login, Notizen, Audio) | `src/band-worker.js` – läuft nur für `/band*` |
| Oberfläche | `band/index.html`, `band/app.js`, `band/style.css` |
| Songdaten (`songs.json`, Vorlagen) und Audio | Cloudflare **Workers KV** `plus-one-band-files` – **nicht** im Repo |
| Notizen der Band | Cloudflare **D1** `plus-one-band` (Tabelle `notes`) |
| Zugänge | Cloudflare-Secret `BAND_ACCOUNTS` (nur Passwort-Hashes) |

Die Quelldateien (Audio, `songs.json`, Kontoverwaltung) liegen lokal in `PlusOne_Bandbereich/` und sind
per `.gitignore`/`.assetsignore` ausgeschlossen. Für die folgenden Befehle einmal `npx wrangler login` ausführen.

**Bandmitglied hinzufügen** (im Ordner `PlusOne_Bandbereich`, PowerShell):

```powershell
$env:BAND_DATA_DIR="$PWD\data-live"; node accounts.mjs add <login> "<Anzeigename>" <Stimme>
```

Das Passwort wird einmal angezeigt – einzeln und privat weitergeben. Danach die Konten hochladen (im Webseiten-Ordner):

```powershell
Get-Content PlusOne_Bandbereich\data-live\accounts.json -Raw | npx wrangler secret put BAND_ACCOUNTS
```

**Songdaten oder Audio aktualisieren:**

```powershell
npx wrangler kv key put --binding BAND_FILES --remote songs.json --path PlusOne_Bandbereich\private\songs.json
npx wrangler kv key put --binding BAND_FILES --remote audio/move.mp3 --path PlusOne_Bandbereich\private\audio\move.mp3
```

**Notizen sichern:** `npx wrangler d1 export plus-one-band --remote --output notizen-backup.sql`
