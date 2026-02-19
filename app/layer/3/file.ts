import { crypto } from "@std/crypto";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { Middleware } from "../../src/framework.ts";
import { PutObjectCommand, s3, toKey } from "../../src/s3.ts";
import { db } from "../../src/sqlite.ts";
import { getId } from "../../src/url.ts";
import { aFile } from "../../browser/src/data.ts";

// also: ["-colorspace", "RGB"]
const magickToAVIF = new Deno.Command("magick", {
  args: ["-", "-resize", ">2048x>2048", "-strip", "avif:-"],
  stdin: "piped",
  stdout: "piped",
});

type BACT = [Uint8Array, string | null];

const toAVIF = async (
  bytes: Uint8Array,
  contentType: string | null,
): Promise<BACT> => {
  const spawnToAVIF = magickToAVIF.spawn();
  spawnToAVIF.ref();

  const writer = spawnToAVIF.stdin.getWriter();
  await writer.write(bytes);
  writer.releaseLock();
  await spawnToAVIF.stdin.close();
  spawnToAVIF.unref();

  const converted = await spawnToAVIF.stdout.bytes();
  if ((await spawnToAVIF.status).success) return [converted, "image/avif"];
  return [bytes, contentType];
};

const process = async (
  bytes: Uint8Array,
  contentType: string | null,
): Promise<BACT> => {
  if (contentType?.startsWith("image/")) {
    return await toAVIF(bytes, contentType);
  }

  return [bytes, contentType];
};

export const postFile: Middleware = async (ctx, _) => {
  const reqBytes = await ctx.req.bytes();
  const reqContentType = ctx.req.headers.get("content-type");

  try {
    using stmt0 = db.prepare(
      "INSERT INTO file (md5, content_type) VALUES (?, ?)",
    );
    const upload = db.transaction(async (b: Uint8Array, cT: string | null) => {
      const md5 = new Uint8Array(
        await crypto.subtle.digest("MD5", b as BufferSource),
      );
      stmt0.run(md5, cT);
      await s3.send(
        new PutObjectCommand({
          Key: toKey(BigInt(db.lastInsertRowId)),
          Body: b,
        }),
      );
    });

    const [bytes, contentType] = await process(reqBytes, reqContentType);
    await upload(bytes, contentType);
  } catch (e) {
    let error = e;
    while (error instanceof SuppressedError) error = error.suppressed;

    let message = (error instanceof Error)
      ? String(error.message)
      : "Unknown error w/ UPLOAD.";
    if (message.startsWith("UNIQUE constraint")) {
      message = "file already uploaded.";
    }
    ctx.res = new Response(message, { status: 400 });
    return;
  }

  ctx.res = cborResponse(db.lastInsertRowId);
};

export const updateFile: Middleware = async (ctx, _) => {
  const id = getId("/3/file/", ctx.url.pathname);
  if (!id) return;

  const r = cborDecode(await ctx.req.bytes());
  if (!(r instanceof Map)) {
    ctx.res = new Response("Bad input.", { status: 400 });
    return;
  }

  const file = aFile.forUpdate(r) as Record<string, typeof aFile.valueType>;
  if (!Object.keys(file).length) {
    ctx.res = new Response("Empty record.", { status: 500 });
    return;
  }

  if (!Object.keys(file)) return;

  using stmt0 = db.prepare(
    "UPDATE file SET " +
      Object.entries(file).map((e) => e[0] + " = ?").join(", ") +
      " WHERE id = ?",
  );
  if (stmt0.run([...Object.values(file), id]) !== 1) {
    ctx.res = new Response("UPDATE failed.", { status: 500 });
    return;
  }

  using stmt1 = db.prepare("SELECT * FROM file WHERE id = ?");
  const select = stmt1.get(id);
  if (!select) {
    ctx.res = new Response("SELECT failed.", { status: 500 });
    return;
  }

  ctx.res = cborResponse(select);
};
