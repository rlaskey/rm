import { Database } from "bun:sqlite";

const MODES = {
  default: "BEGIN",
  deferred: "BEGIN DEFERRED",
  immediate: "BEGIN IMMEDIATE",
  exclusive: "BEGIN EXCLUSIVE",
};

const location = (db: Database): string | null => {
  const row = db
    .prepare("PRAGMA database_list")
    .all()
    .find((r) => (r as { name: string }).name === "main") as
    { file: string } | undefined;
  return row?.file || null;
};

export const transaction = async (
  db: Database,
  f: (innerDB: Database) => Promise<void> | void,
  mode: keyof typeof MODES = "default",
) => {
  const loc = location(db);
  if (!loc) throw new Error("Transactions need a location.");
  const dbT = new Database(loc);

  const begin = MODES[mode] ?? MODES.default;
  const ohno = "ROLLBACK";
  const end = "COMMIT";
  let inTransaction = false;

  try {
    dbT.run(begin);
    inTransaction = true;
    await f(dbT);
    dbT.run(end);
    inTransaction = false;
  } catch (e) {
    if (inTransaction) dbT.run(ohno);
    throw e;
  } finally {
    dbT.close();
  }
};
