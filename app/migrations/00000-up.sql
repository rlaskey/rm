CREATE TABLE reference (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,

  url TEXT UNIQUE,
  wikipedia TEXT UNIQUE,
  bandcamp TEXT UNIQUE,
  apple_music TEXT UNIQUE,
  spotify TEXT UNIQUE,
  tidal TEXT UNIQUE,
  discogs TEXT UNIQUE,
  goodreads TEXT UNIQUE
);

CREATE TABLE reference_pair (
  a INTEGER NOT NULL,
  b INTEGER NOT NULL,

  CHECK (a < b),

  PRIMARY KEY (a, b),

  FOREIGN KEY (a) REFERENCES reference (id) ON DELETE CASCADE,
  FOREIGN KEY (b) REFERENCES reference (id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX reference_pair_b ON reference_pair (b);

CREATE TABLE article (
  id INTEGER PRIMARY KEY,
  published INTEGER,
  markdown TEXT NOT NULL,

  title TEXT
);
CREATE INDEX article_published ON article (published);

CREATE TABLE article_pair (
  a INTEGER NOT NULL,
  b INTEGER NOT NULL,

  CHECK (a < b),

  PRIMARY KEY (a, b),

  FOREIGN KEY (a) REFERENCES article (id) ON DELETE CASCADE,
  FOREIGN KEY (b) REFERENCES article (id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX article_pair_b ON article_pair (b);

CREATE TABLE article_reference (
  article_id INTEGER NOT NULL,
  reference_id INTEGER NOT NULL,

  PRIMARY KEY (article_id, reference_id),

  FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE,
  FOREIGN KEY (reference_id) REFERENCES reference (id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX article_reference_reference_id ON article_reference (reference_id);

CREATE TABLE user (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  write INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX user_write ON user (write) WHERE write = 1;

CREATE TABLE passkey (
  id TEXT PRIMARY KEY,
  alg INTEGER NOT NULL,
  public_key TEXT NOT NULL,
  user_id INTEGER NOT NULL,

  FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  data BLOB NOT NULL,
  updated_at INTEGER NOT NULL,
  user_id INTEGER,

  FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX session_user ON session (user_id) WHERE user_id IS NOT NULL;
