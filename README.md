# +one – Webseite (Prototyp)

Statische Seite ohne Build-Schritt: `index.html`, `styles.css`, `script.js`, `datenschutz.html`, Bilder in `assets/img/`.
Inhalte und Bilder stammen von der bisherigen Seite plus-one-kempten.com.

## Lokal ansehen

```bash
npx http-server@14.1.1 -p 8080 .
```

Dann http://localhost:8080 öffnen.

## Hosten: GitHub → Cloudflare Pages, Domain plus-one-kempten.de

Jeder Push auf `main` wird von Cloudflare Pages automatisch veröffentlicht. Es gibt keinen Build-Schritt.

### 1. Domain registrieren
`plus-one-kempten.de` bei einem Registrar bestellen, z. B. INWX (ca. 5 €/Jahr).
Cloudflare Registrar verkauft .de nach aktuellem Stand vermutlich nicht.

### 2. Cloudflare Pages mit GitHub verbinden
1. Kostenloses Konto auf https://dash.cloudflare.com anlegen.
2. **Workers & Pages → Create → Pages → Connect to Git** → GitHub autorisieren → Repo `plus-one-website` wählen.
3. Build-Einstellungen: Framework preset **None**, Build command **leer**, Build output directory **`/`**.
4. **Save and Deploy** → die Seite ist unter `https://<projekt>.pages.dev` erreichbar.

### 3. Domain verbinden
1. Cloudflare Dashboard → **Add a domain** → `plus-one-kempten.de` → Free-Plan.
2. Cloudflare zeigt zwei Nameserver an (z. B. `xyz.ns.cloudflare.com`). Diese beim Registrar (INWX) als Nameserver eintragen.
   Das dauert einige Minuten bis wenige Stunden.
3. Im Pages-Projekt → **Custom domains → Set up a custom domain** → `plus-one-kempten.de` und `www.plus-one-kempten.de`.
   Cloudflare legt die DNS-Einträge und das SSL-Zertifikat automatisch an.

### 4. Alte Domain plus-one-kempten.com (bezahlt bis 28.08.2027 bei ALL-INKL)
Im ALL-INKL-KAS eine Weiterleitung (301) auf `https://plus-one-kempten.de` einrichten.
Später entweder zu Cloudflare umziehen oder auslaufen lassen.

### Limits (Cloudflare Pages Free)
Max. 25 MiB pro Datei und 20.000 Dateien. Bandbreite ist unbegrenzt.

## Videos

`assets/video/solo-1..3.mp4` sind die Originale von der alten Seite (1080p, ~547 MB gesamt),
komprimiert auf 720p H.264 (~53 MB gesamt) mit Standbildern `solo-1..3.jpg`. Jede Datei muss **unter 25 MiB** bleiben (Cloudflare-Limit).
Neue Videos so umwandeln (ca. 1 MiB pro 4–5 Sekunden; längere Videos lieber auf YouTube):

```bash
ffmpeg -i input.mp4 -vf scale=-2:720 -c:v libx264 -preset slow -crf 27 -maxrate 1900k -bufsize 3800k -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart solo-4.mp4
```

## Offen vor dem Livegang

- **Events:** stehen direkt in `index.html` (Abschnitt `id="live"`) – neue Termine als weiteres `<li class="gig">` ergänzen.
- **Social Links:** Instagram und Facebook waren auf der alten Seite leer (`#`) – echte Links in `index.html` eintragen.
- **Impressum/Datenschutz:** fertig (Fußzeile in `index.html`, `datenschutz.html`). Bei Änderungen an der Seite (neue Dienste, YouTube einblenden) die Datenschutzerklärung mitziehen.
- **Bilder:** für schnellere Ladezeit nach WebP konvertieren / verkleinern (aktuell ~4,5 MB gesamt).
