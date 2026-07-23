import { DatabaseSync } from "node:sqlite";

const path: string = Deno.env.get("SQLITE_PATH") ??
  Deno.env.get("HOME") + "/rm.sqlite";

export const db = new DatabaseSync(path);
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA journal_mode = WAL");
