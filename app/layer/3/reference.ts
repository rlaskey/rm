import { dbReference, mapToZodObject } from "../../browser/src/data.ts";

import type { Middleware } from "../../src/framework.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { r400 } from "../../src/response.ts";
import { db } from "../../src/sqlite.ts";
import { getId } from "../../src/url.ts";

const Reference = dbReference.omit({ "id": true });

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

  const src = db.prepare(
    "INSERT INTO reference (" + Object.keys(spr.data).join(", ") +
      ") VALUES (" +
      Object.keys(spr.data).map((_) => "?").join(", ") +
      ")",
  ).run(...Object.values(spr.data));
  if (src.changes != 1) {
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

  const spr = mapToZodObject(r, dbReference.omit({ id: true }));
  if (!spr.success) {
    ctx.res = new Response(spr.error.message, { status: 400 });
    return;
  }

  const src = db.prepare(
    "UPDATE reference SET " +
      Object.keys(spr.data).map((e) => e + " = ?").join(", ") +
      " WHERE id = ?",
  ).run(...Object.values(spr.data), id);
  if (src.changes != 1) {
    ctx.res = new Response("UPDATE failed.", { status: 500 });
    return;
  }

  const select = db.prepare("SELECT * FROM reference WHERE id = ?").get(id);
  if (!select) {
    ctx.res = new Response("SELECT failed.", { status: 500 });
    return;
  }

  ctx.res = cborResponse(select);
};
