import { Database, Statement } from "bun:sqlite";

const path: string = process.env.SQLITE_PATH ?? process.env.HOME + "/rm.sqlite";

// bun-types types Statement results as `unknown` unless a row type is given
// at every call site; keep the loose row typing the code was written against.
type AnyStatement = Statement<any, any[]>;

export const db: Omit<Database, "prepare"> & {
  prepare(sql: string, params?: unknown): AnyStatement;
} = new Database(path) as never;

db.run("PRAGMA foreign_keys = ON");
db.run("PRAGMA journal_mode = WAL");
