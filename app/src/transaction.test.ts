import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";

import { transaction } from "./transaction.ts";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DIR = mkdtempSync(join(tmpdir(), "rm-test-"));
const SQLITE_PATH = join(DIR, "test.sqlite");

const newDB = () => new Database(SQLITE_PATH);
let db = newDB();

beforeEach(() => {
  db = newDB();
  db.run("PRAGMA journal_mode = WAL");
  db.run("CREATE TABLE x (id INTEGER PRIMARY KEY)");
});

afterEach(() => {
  db.run("DROP TABLE x");
  db.close();
});

afterAll(() => {
  rmSync(DIR, { recursive: true, force: true });
});

test("commits", async () => {
  await transaction(db, (innerDB) => {
    innerDB.run("INSERT INTO x VALUES (NULL)");
  });

  const result = db.prepare("SELECT id FROM x").get() as { id: number };
  expect(result?.id).toBe(1);
});

test("rolls back", async () => {
  await expect(
    (async () => {
      await transaction(db, (innerDB) => {
        innerDB.run("INSERT INTO x VALUES (NULL)");
        throw new Error("Simulated error");
      });
    })(),
  ).rejects.toThrow("Simulated error");

  const result = db.prepare("SELECT id FROM x").get();
  expect(result).toBeNull();
});

test("nested transactions are rejected", async () => {
  await transaction(db, async (db1) => {
    db1.run("INSERT INTO x VALUES (3)");

    await expect(
      (async () => {
        await transaction(db, (db2) => {
          db2.run("INSERT INTO x VALUES (5)");
        });
      })(),
    ).rejects.toThrow();

    db1.run("INSERT INTO x VALUES (7)");
  });

  const result = db.prepare("SELECT id FROM x").all() as { id: number }[];
  expect(result.map((x) => x.id)).toEqual([3, 7]);
});

test("interleaved requests", async () => {
  const reqA = (async () => {
    await transaction(db, async (innerDB) => {
      await delay(100);
      innerDB.run("INSERT INTO x VALUES (1)");
    });
  })();

  const reqB = (async () => {
    await delay(10);
    await transaction(db, (innerDB) => {
      innerDB.run("INSERT INTO x VALUES (2)");
    });
  })();

  await Promise.all([reqA, reqB]);

  const result = db.prepare("SELECT id FROM x").all() as { id: number }[];
  expect(result.map((x) => x.id)).toEqual([1, 2]);
});

test("transaction modes", async () => {
  await transaction(db, async () => {}, "deferred");
  await transaction(db, async () => {}, "immediate");
  await transaction(db, async () => {}, "exclusive");
});
