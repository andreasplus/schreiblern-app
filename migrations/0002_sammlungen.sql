-- Sammlungen (Druck-Sets, APP-17): vom Betreiber gepflegte, öffentliche Gruppen von Bedeutungen.
-- Eine Bedeutung kann in mehreren Sammlungen stehen.

CREATE TABLE collections (
  id          TEXT PRIMARY KEY CHECK (id GLOB '[a-z0-9-]*'),
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE collection_items (
  collection_id TEXT NOT NULL REFERENCES collections (id),
  meaning_id    TEXT NOT NULL REFERENCES meanings (id),
  sort_order    INTEGER NOT NULL,
  PRIMARY KEY (collection_id, meaning_id)
);
CREATE INDEX collection_items_meaning ON collection_items (meaning_id);
