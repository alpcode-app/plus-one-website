-- Gemeinsame Ensemble-Notizen des Bandbereichs (Cloudflare D1)
CREATE TABLE IF NOT EXISTS notes (
  key     TEXT PRIMARY KEY,   -- <song-id>:<abschnitt-start>:<stimme 0-5>
  text    TEXT NOT NULL,
  version INTEGER NOT NULL,
  by      TEXT NOT NULL,
  at      TEXT NOT NULL
);
