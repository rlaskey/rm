import { dbReference, mapToZodObject } from "../../browser/src/data.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import type { Middleware } from "../../src/framework.ts";
import { r400 } from "../../src/response.ts";
import type { InValue } from "@libsql/client";

import { client } from "../../src/sqlite.ts";
import { getId } from "../../src/url.ts";

const Reference = dbReference.omit({ id: true });

export const insertReference: Middleware = async (ctx, _) => {
  const r = cborDecode(await ctx.req.bytes());
  if (!(r instanceof Map)) {
    ctx.res = r400;
    return;
  }

  const spr = mapToZodObject(r, Reference);
  if (!spr.success) {
    ctx.res = new Response(spr.error.message, { status: 400 });
    return;
  }

  const src = await client.execute({
    sql:
      "INSERT INTO reference (" +
      Object.keys(spr.data).join(", ") +
      ") VALUES (" +
      Object.keys(spr.data)
        .map((_) => "?")
        .join(", ") +
      ")",
    args: Object.values(spr.data) as InValue[],
  });
  if (src.lastInsertRowid === undefined) {
    ctx.res = new Response("INSERT failed.", { status: 500 });
    return;
  }

  ctx.res = cborResponse(src.lastInsertRowid);
};

export const updateReference: Middleware = async (ctx, _) => {
  const id = getId("/3/reference/", ctx.url.pathname);
  if (!id) return;

  const r = cborDecode(await ctx.req.bytes());
  if (!(r instanceof Map)) {
    ctx.res = r400;
    return;
  }

  const spr = mapToZodObject(r, Reference);
  if (!spr.success) {
    ctx.res = new Response(spr.error.message, { status: 400 });
    return;
  }

  const src = await client.execute({
    sql:
      "UPDATE reference SET " +
      Object.keys(spr.data)
        .map((e) => e + " = ?")
        .join(", ") +
      " WHERE id = ?",
    args: [...(Object.values(spr.data) as InValue[]), id],
  });
  if (src.rowsAffected != 1) {
    ctx.res = new Response("UPDATE failed.", { status: 500 });
    return;
  }

  const select = (
    await client.execute("SELECT * FROM reference WHERE id = ?", [id])
  ).rows[0];
  if (!select) {
    ctx.res = new Response("SELECT failed.", { status: 500 });
    return;
  }

  ctx.res = cborResponse(select);
};
