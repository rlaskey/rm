import { readFileSync } from "node:fs";

import { client } from "../src/sqlite.ts";

await client.execute(
  "CREATE TABLE IF NOT EXISTS migrate " +
    "(id INTEGER PRIMARY KEY, v INTEGER NOT NULL);",
);
await client.execute("INSERT OR IGNORE INTO migrate VALUES (1, -1);");
let version = Number(
  (await client.execute("SELECT v FROM migrate WHERE id = 1")).rows[0]?.v ?? -1,
);

const up = (id: number): string | null => {
  const path = String(id).padStart(5, "0");
  try {
    return readFileSync(`${import.meta.dirname}/${path}-up.sql`, "utf8");
  } catch (e) {
    if ((e as { code?: string }).code === "ENOENT") return null;
    throw e;
  }
};

let current;
while ((current = up(++version))) {
  console.log(`Running migration: ${version}.`);
  // executeMultiple runs the script as-is; the scripts manage their own
  // BEGIN/COMMIT and PRAGMA foreign_keys toggling. Local file: URLs only --
  // against a remote database, split each script into batch() statements.
  await client.executeMultiple(current);
  await client.execute(`UPDATE migrate SET v = ${version} WHERE id = 1`);
}

client.close();
