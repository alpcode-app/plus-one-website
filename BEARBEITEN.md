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
| Termine | `index.html` | Abschnitt `id="live"`: einen `<li class="gig">…</li>`-Block kopieren und Datum, Titel, Ort ändern |
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
