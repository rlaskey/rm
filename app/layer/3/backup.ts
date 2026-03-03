import { Database } from "@db/sqlite";

import { zeroPad } from "../../browser/src/dates.ts";

import { joinUint8Arrays } from "../../src/bytes.ts";
import { type Middleware } from "../../src/framework.ts";
import { db } from "../../src/sqlite.ts";
import { PutObjectCommand, s3 } from "../../src/s3.ts";

const gz = async (path: string): Promise<Uint8Array> => {
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(await Deno.readFile(path));
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

export const backup: Middleware = async (ctx, _) => {
  const t = await Deno.makeTempFile();

  const dest = new Database(t, { int64: true });
  db.backup(dest);
  dest.close();

  const now = new Date();
  const Key = "00-db/" + now.getUTCFullYear() + "/" +
    zeroPad(now.getUTCMonth() + 1) + "-" + zeroPad(now.getUTCDate()) +
    ".sqlite.gz";

  const Body = await gz(t);
  await s3.send(new PutObjectCommand({ Key, Body }));
  await Deno.remove(t);

  ctx.res = new Response(Key + " -- " + Body.byteLength);
};
