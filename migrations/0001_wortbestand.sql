-- P0: gemeinsamer Wortbestand mit getrennten Bedeutungen (APP-02).
-- Browserkennungen, Listen, Erstellaufträge und Kontingente folgen in P1 als eigene Migrationen.

CREATE TABLE pictograms (
  id          TEXT PRIMARY KEY,
  -- builtin: Vektorzeichnung aus dem Code (src/shared/pictograms.ts)
  -- color/number: aus den Daten der Bedeutung erzeugt
  -- file: versionierte SVG-Datei aus einer lizenzierten Bibliothek (ab P1)
  kind        TEXT NOT NULL CHECK (kind IN ('builtin', 'color', 'number', 'file')),
  path        TEXT,
  library     TEXT NOT NULL,
  license     TEXT NOT NULL,
  attribution TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE words (
  id         TEXT PRIMARY KEY,
  lang       TEXT NOT NULL CHECK (lang IN ('de')),
  -- Anzeigeform mit korrekter Groß- und Kleinschreibung, z. B. „Bank“ oder „grün“
  display    TEXT NOT NULL,
  -- Suchform: NFC, getrimmt, Leerzeichen zusammengefasst, kleingeschrieben.
  -- Umlaute und ß bleiben erhalten, „schon“ und „schön“ sind verschieden.
  normalized TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (lang, display)
);
CREATE INDEX words_normalized ON words (lang, normalized);

CREATE TABLE meanings (
  id             TEXT PRIMARY KEY,
  word_id        TEXT NOT NULL REFERENCES words (id),
  -- Normalisierte Bedeutungsangabe; '' für die einzige bzw. Standardbedeutung.
  sense_key      TEXT NOT NULL,
  -- Kurze Bedeutungsangabe für die Auswahl, z. B. „Geldinstitut“. Erscheint nie auf dem Arbeitsblatt.
  description    TEXT,
  translation_en TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('word', 'color', 'number')),
  number_value   INTEGER CHECK (number_value IS NULL OR number_value BETWEEN 0 AND 20),
  color_hex      TEXT CHECK (color_hex IS NULL OR color_hex GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'),
  -- NULL bedeutet ausdrücklich „ohne Bild“; der Bildbereich bleibt leer.
  pictogram_id   TEXT REFERENCES pictograms (id),
  status         TEXT NOT NULL CHECK (status IN ('reference', 'reviewed', 'draft')),
  source         TEXT NOT NULL,
  version        INTEGER NOT NULL DEFAULT 1,
  -- Reihenfolge der vorbereiteten Sammlungen (words, numbers, extra, …)
  collection     TEXT,
  sort_order     INTEGER,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (word_id, sense_key),
  CHECK (kind <> 'number' OR number_value IS NOT NULL),
  CHECK (kind <> 'color' OR color_hex IS NOT NULL)
);
CREATE INDEX meanings_word ON meanings (word_id);
CREATE INDEX meanings_collection ON meanings (collection, sort_order);
