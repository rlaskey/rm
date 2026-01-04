# Postgres

Via `psql -U postgres`, run the following commands. `barry` and `site`
can and probably should be adjusted, to taste.

```
CREATE USER barry;
CREATE DATABASE site;
\c site
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO barry;
```
