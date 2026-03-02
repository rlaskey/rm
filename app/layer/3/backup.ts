import { Database } from "@db/sqlite";

import { zeroPad } from "../../browser/src/dates.ts";

import { type Middleware } from "../../src/framework.ts";
import { db } from "../../src/sqlite.ts";
import { PutObjectCommand, s3 } from "../../src/s3.ts";

export const backup: Middleware = async (ctx, _) => {
  const t = await Deno.makeTempFile();

  const dest = new Database(t, { int64: true });
  db.backup(dest);
  dest.close();

  const now = new Date();
  const Key = "00-db/" + now.getUTCFullYear() + "/" +
    zeroPad(now.getUTCMonth()) + "-" + zeroPad(now.getUTCDate()) + ".sqlite";

  await s3.send(new PutObjectCommand({ Key, Body: await Deno.readFile(t) }));
  const fileInfo = await Deno.lstat(t);
  await Deno.remove(t);

  ctx.res = new Response(Key + " -- " + fileInfo.size);
};
