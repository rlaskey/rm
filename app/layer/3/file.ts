import type { InValue } from "@libsql/client";

import { dbFile, mapToZodObject } from "../../browser/src/data.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { Middleware } from "../../src/framework.ts";
import { r400 } from "../../src/response.ts";
import { PutObjectCommand, s3, toKey } from "../../src/s3.ts";
import { client } from "../../src/sqlite.ts";
import { getId } from "../../src/url.ts";

// also: ["-colorspace", "RGB"]
const MAGICK_ARGS = [
  "-",
  "-resize",
  "2048x2048^>",
  "-resize",
  "8192x8192>",
  "+profile",
  "!icc,*",
  "avif:-",
];

type BACT = [Uint8Array<ArrayBuffer>, string | null];

const toAVIF = async (
  bytes: Uint8Array<ArrayBuffer>,
  contentType: string | null,
): Promise<BACT> => {
  const proc = Bun.spawn(["magick", ...MAGICK_ARGS], {
    stdin: bytes,
    stdout: "pipe",
    stderr: "ignore",
  } as const);

  const converted = new Uint8Array(
    await new Response(proc.stdout).arrayBuffer(),
  );
  if ((await proc.exited) === 0) return [converted, "image/avif"];
  return [bytes, contentType];
};

const process = async (
  bytes: Uint8Array<ArrayBuffer>,
  contentType: string | null,
): Promise<BACT> => {
  if (contentType?.startsWith("image/")) {
    return await toAVIF(bytes, contentType);
  }

  return [bytes, contentType];
};

export const insertFile: Middleware = async (ctx, _) => {
  const reqBytes = await ctx.req.bytes();
  const reqContentType = ctx.req.headers.get("content-type");
  let lastInsertRowId: bigint | undefined;

  const tx = await client.transaction("write");
  try {
    const [bytes, contentType] = await process(reqBytes, reqContentType);
    const sha256 = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const { lastInsertRowid } = await tx.execute({
      sql: "INSERT INTO file (sha256, content_type) VALUES (?, ?)",
      args: [sha256, contentType],
    });
    if (lastInsertRowid === undefined) {
      throw new Error("INSERT failed.");
    }
    lastInsertRowId = lastInsertRowid;
    await s3.send(
      new PutObjectCommand({
        Key: toKey(lastInsertRowId),
        Body: bytes,
      }),
    );
    await tx.commit();
  } catch (e) {
    let error = e;
    while (error instanceof SuppressedError) error = error.suppressed;

    let message =
      error instanceof Error
        ? String(error.message)
        : "Unknown error w/ UPLOAD.";
    if (message.startsWith("UNIQUE constraint")) {
      message = "file already uploaded.";
    }
    ctx.res = new Response(message, { status: 400 });
    return;
  } finally {
    tx.close();
  }

  ctx.res = cborResponse(lastInsertRowId);
};

export const updateFileBytes: Middleware = async (ctx, _) => {
  const id = getId("/3/file/bytes/", ctx.url.pathname);
  if (!id) return;

  const reqBytes = await ctx.req.bytes();
  const reqContentType = ctx.req.headers.get("content-type");

  const tx = await client.transaction("write");
  try {
    const sha256 = new Uint8Array(
      await crypto.subtle.digest("SHA-256", reqBytes),
    );
    await tx.execute({
      sql: "UPDATE file SET sha256 = ?, content_type = ? WHERE id = ?",
      args: [sha256, reqContentType, id],
    });
    await s3.send(new PutObjectCommand({ Key: toKey(id), Body: reqBytes }));
    await tx.commit();
  } catch (e) {
    let error = e;
    while (error instanceof SuppressedError) error = error.suppressed;

    let message =
      error instanceof Error
        ? String(error.message)
        : "Unknown error w/ UPLOAD.";
    if (message.startsWith("UNIQUE constraint")) {
      message = "file already uploaded.";
    }
    ctx.res = new Response(message, { status: 400 });
    return;
  } finally {
    tx.close();
  }

  ctx.res = cborResponse(null);
};

export const updateFileMeta: Middleware = async (ctx, _) => {
  const id = getId("/3/file/meta/", ctx.url.pathname);
  if (!id) return;

  const r = cborDecode(await ctx.req.bytes());
  if (!(r instanceof Map)) {
    ctx.res = r400;
    return;
  }

  const spr = mapToZodObject(r, dbFile.pick({ title: true }));
  if (!spr.success) {
    ctx.res = r400;
    return;
  }

  if (
    (
      await client.execute({
        sql:
          "UPDATE file SET " +
          Object.keys(spr.data)
            .map((k) => k + " = ?")
            .join(", ") +
          " WHERE id = ?",
        args: [...(Object.values(spr.data) as InValue[]), id],
      })
    ).rowsAffected !== 1
  ) {
    ctx.res = new Response("UPDATE failed.", { status: 500 });
    return;
  }

  const select = (await client.execute("SELECT * FROM file WHERE id = ?", [id]))
    .rows[0];
  if (!select) {
    ctx.res = new Response("SELECT failed.", { status: 500 });
    return;
  }

  // libSQL returns BLOBs as ArrayBuffer; cborEncode accepts that directly.
  ctx.res = cborResponse(select);
};
