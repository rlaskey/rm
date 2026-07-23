import { DatabaseSync } from "node:sqlite";

import { transaction } from "./transaction.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { FakeTime } from "@std/testing/time";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SQLITE_PATH = Deno.makeTempFileSync();

const newDB = () => new DatabaseSync(SQLITE_PATH);
let db = newDB();

Deno.test.beforeEach(() => {
  db = newDB();
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("CREATE TABLE x (id INTEGER PRIMARY KEY)");
});

Deno.test.afterEach(() => {
  db.exec("DROP TABLE x");
  db.close();
});

Deno.test.afterAll(() => {
  Deno.removeSync(SQLITE_PATH);
});

Deno.test("commits", async () => {
  await transaction(db, (innerDB) => {
    innerDB.exec("INSERT INTO x VALUES (NULL)");
  });

  const result = db.prepare("SELECT id FROM x").get();
  assertEquals(result?.id, 1);
});

Deno.test("rolls back", () => {
  assertRejects(
    async () => {
      await transaction(db, (innerDB) => {
        innerDB.exec("INSERT INTO x VALUES (NULL)");
        throw new Error("Simulated error");
      });
    },
    Error,
    "Simulated error",
  );

  const result = db.prepare("SELECT id FROM x").get();
  assertEquals(result, undefined);
});

Deno.test("nested transactions are rejected", async () => {
  await transaction(db, (db1) => {
    db1.exec("INSERT INTO x VALUES (3)");

    assertRejects(async () => {
      await transaction(db, (db2) => {
        db2.exec("INSERT INTO x VALUES (5)");
      });
    });

    db1.exec("INSERT INTO x VALUES (7)");
  });

  const result = db.prepare("SELECT id FROM x").all();
  assertEquals(result.map((x) => x.id), [3, 7]);
});

Deno.test("interleaved requests", async () => {
  using time = new FakeTime();

  const reqA = (async () => {
    await transaction(db, async (innerDB) => {
      await delay(100);
      innerDB.exec("INSERT INTO x VALUES (1)");
    });
  })();

  const reqB = (async () => {
    await delay(10);
    await transaction(db, (innerDB) => {
      innerDB.exec("INSERT INTO x VALUES (2)");
    });
  })();

  // NOTE: we need both of these
  await time.tickAsync(10);
  await time.tickAsync(90);

  await Promise.all([reqA, reqB]);

  const result = db.prepare("SELECT id FROM x").all();
  assertEquals(result.map((x) => x.id), [1, 2]);
});

Deno.test("transaction modes", async () => {
  await transaction(db, async () => {}, "deferred");
  await transaction(db, async () => {}, "immediate");
  await transaction(db, async () => {}, "exclusive");
});
