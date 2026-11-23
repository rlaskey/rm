import { readFileSync } from "node:fs";

import { db } from "../src/sqlite.ts";

db.run(
  "CREATE TABLE IF NOT EXISTS migrate " +
    "(id INTEGER PRIMARY KEY, v INTEGER NOT NULL);",
);
db.run("INSERT OR IGNORE INTO migrate VALUES (1, -1);");
let version = (db.prepare("SELECT v FROM migrate WHERE id = 1").get() || {
  v: -1,
})["v"] as number;

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
  db.run(current);
  db.run(`UPDATE migrate SET v = ${version} WHERE id = 1`);
}

db.close();
