import { createClient } from "@libsql/client";

export const client = createClient({
  url: process.env.DATABASE_URL ?? `file:${process.env.HOME + "/rm.sqlite"}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
  intMode: "bigint",
});

// revisit / abandon when we move off of `file:`
await client.execute("PRAGMA journal_mode = WAL");
