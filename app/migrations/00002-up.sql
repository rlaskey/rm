CREATE TABLE file (
  id INTEGER PRIMARY KEY,
  md5 BLOB NOT NULL UNIQUE,
  content_type TEXT,

  title TEXT
);
