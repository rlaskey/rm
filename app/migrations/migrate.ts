// deno -ERW
import { db } from "@/src/sqlite.ts";

db.exec(
  "CREATE TABLE IF NOT EXISTS migrate " +
    "(id INTEGER PRIMARY KEY, v INTEGER NOT NULL);",
);
db.exec("INSERT OR IGNORE INTO migrate VALUES (1, -1);");
let version = (
  db.prepare("SELECT v FROM migrate WHERE id = 1").get() ||
  { v: -1 }
)["v"] as number;

const up = (id: number): string | null => {
  try {
    const path = String(id).padStart(5, "0");
    return Deno.readTextFileSync(`${import.meta.dirname}/${path}-up.sql`);
  } catch (e) {
    if (!(e instanceof Error)) {
      throw e;
    }

    if (e.name !== "NotFound") throw e;
    return null;
  }
};

let current;
while ((current = up(++version))) {
  console.log(`Running migration: ${version}.`);

  db.exec("BEGIN TRANSACTION");
  db.exec(current);
  db.exec(`UPDATE migrate SET v = ${version} WHERE id = 1`);
  db.exec("COMMIT");
}

db.close();
