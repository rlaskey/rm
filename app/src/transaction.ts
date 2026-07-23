import { DatabaseSync } from "node:sqlite";

const MODES = {
  default: "BEGIN",
  deferred: "BEGIN DEFERRED",
  immediate: "BEGIN IMMEDIATE",
  exclusive: "BEGIN EXCLUSIVE",
};

export const transaction = async (
  db: DatabaseSync,
  f: (innerDB: DatabaseSync) => Promise<void> | void,
  mode: keyof typeof MODES = "default",
) => {
  const location = db.location();
  if (!location) throw new Error("Transactions need a location.");
  using dbT = new DatabaseSync(location);

  const begin = MODES[mode] ?? MODES.default;
  const ohno = "ROLLBACK";
  const end = "COMMIT";

  try {
    dbT.exec(begin);
    await f(dbT);
    dbT.exec(end);
  } catch (e) {
    if (dbT.isTransaction) dbT.exec(ohno);
    throw e;
  }
};
