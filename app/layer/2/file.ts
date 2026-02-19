import { type Middleware } from "../../src/framework.ts";

import { cborResponse } from "../../src/cbor-encode.ts";
import { db } from "../../src/sqlite.ts";
import { GetObjectCommand, s3, toKey } from "../../src/s3.ts";
import { getId } from "../../src/url.ts";

export const getBytes: Middleware = async (ctx, _) => {
  const id = getId("/2/bytes/", ctx.url.pathname);
  if (!id) return;

  const fromS3 = await s3.send(
    new GetObjectCommand({ Key: toKey(BigInt(id)) }),
  );

  const headers = new Headers({ "Cache-Control": "max-age=3600" });

  const s3ContentType = fromS3.headers.get("content-type");
  if (s3ContentType) headers.set("Content-Type", s3ContentType);

  ctx.res = new Response(fromS3.body, { headers });
};

export const getFile: Middleware = (ctx, _) => {
  const id = getId("/2/file/", ctx.url.pathname);
  if (!id) return;

  using stmt0 = db.prepare("SELECT * FROM file WHERE id = ?");
  const f = stmt0.get(id);
  if (!f) return;
  const result: Record<string, unknown> = { file: f };

  ctx.res = cborResponse(result);
};
