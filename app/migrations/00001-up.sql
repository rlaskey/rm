PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

ALTER TABLE article RENAME COLUMN markdown TO words;


CREATE TABLE url (
  id TEXT PRIMARY KEY,
  reference_id INTEGER NOT NULL,
  label TEXT,
  FOREIGN KEY (reference_id) REFERENCES reference (id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX url_reference_id ON url (reference_id);

INSERT INTO url SELECT url, id, NULL FROM reference WHERE url IS NOT NULL;
INSERT INTO url SELECT wikipedia, id, 'Wikipedia' FROM reference WHERE wikipedia IS NOT NULL;
INSERT INTO url SELECT bandcamp, id, 'Bandcamp' FROM reference WHERE bandcamp IS NOT NULL;
INSERT INTO url SELECT apple_music, id, 'Apple Music' FROM reference WHERE apple_music IS NOT NULL;
INSERT INTO url SELECT spotify, id, 'Spotify' FROM reference WHERE spotify IS NOT NULL;
INSERT INTO url SELECT tidal, id, 'Tidal' FROM reference WHERE tidal IS NOT NULL;
INSERT INTO url SELECT discogs, id, 'Discogs' FROM reference WHERE discogs IS NOT NULL;
INSERT INTO url SELECT goodreads, id, 'Goodreads' FROM reference WHERE goodreads IS NOT NULL;


CREATE TABLE reference_v2 (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
INSERT INTO reference_v2 SELECT id, name FROM reference;
DROP TABLE reference;
ALTER TABLE reference_v2 RENAME TO reference;

COMMIT TRANSACTION;
PRAGMA foreign_keys = ON;
