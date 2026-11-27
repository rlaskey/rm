import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { zeroPad } from "../../browser/src/dates.ts";

import { joinUint8Arrays } from "../../src/bytes.ts";
import { type Middleware } from "../../src/framework.ts";
import { client } from "../../src/sqlite.ts";
import { PutObjectCommand, s3 } from "../../src/s3.ts";

const gz = async (path: string): Promise<Uint8Array> => {
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(await readFile(path));
  writer.close();

  let done = false;
  const output: Uint8Array[] = [];

  const reader = stream.readable.getReader();
  while (!done) {
    const c = await reader.read();
    if (c.value) output.push(c.value);
    done = c.done;
  }

  return joinUint8Arrays(output);
};

export const doBackup: Middleware = async (ctx, _) => {
  // mkdtemp gives a 0700 directory, so the snapshot (session tokens included)
  // is unreadable to other local users even though VACUUM INTO creates the
  // file itself with default permissions. Removed even if the upload fails.
  const dir = await mkdtemp(join(tmpdir(), "rm-backup-"));
  const t = join(dir, "db.sqlite");

  try {
    await client.execute(`VACUUM INTO '${t}'`);

    const now = new Date();
    const Key =
      "00-db/" +
      now.getUTCFullYear() +
      "/" +
      zeroPad(now.getUTCMonth() + 1) +
      "-" +
      zeroPad(now.getUTCDate()) +
      ".sqlite.gz";

    const Body = await gz(t);
    await s3.send(new PutObjectCommand({ Key, Body }));

    ctx.res = new Response(Key + " -- " + Body.byteLength);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};
