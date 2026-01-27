import { Database } from "@db/sqlite";

const path: string = Deno.env.get("SQLITE_PATH") ??
  Deno.env.get("HOME") + "/rm.sqlite";

export const db = new Database(path, { int64: true });
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA journal_mode = WAL");
