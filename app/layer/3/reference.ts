import { type Middleware } from "../../src/framework.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { db } from "../../src/sqlite.ts";
import { getId } from "../../src/url.ts";

import { aReference } from "../../browser/src/data.ts";

export const insertReference: Middleware = async (ctx, _) => {
  const r = cborDecode(await ctx.req.bytes());
  if (!(r instanceof Map)) {
    ctx.res = new Response("Bad input.", { status: 400 });
    return;
  }

  const record = aReference.forInsert(r) as Record<
    string,
    typeof aReference.valueType
  >;
  if (!Object.keys(record).length) {
    ctx.res = new Response("Empty record.", { status: 500 });
    return;
  }

  using stmt = db.prepare(
    "INSERT INTO reference (" + Object.keys(record).join(", ") + ") VALUES (" +
      Object.keys(record).map((_) => "?").join(", ") + ")",
  );
  if (stmt.run(Object.values(record)) !== 1) {
    ctx.res = new Response("INSERT failed.", { status: 500 });
    return;
  }

  ctx.res = cborResponse(db.lastInsertRowId);
};

export const updateReference: Middleware = async (ctx, _) => {
  const id = getId("/3/reference/", ctx.url.pathname);
  if (!id) return;

  const r = cborDecode(await ctx.req.bytes());
  if (!(r instanceof Map)) {
    ctx.res = new Response("Bad input.", { status: 400 });
    return;
  }

  const record = aReference.forUpdate(r) as Record<
    string,
    typeof aReference.valueType
  >;
  if (!Object.keys(record).length) {
    ctx.res = new Response("Empty record.", { status: 500 });
    return;
  }

  if (!Object.keys(record)) return;

  using stmt0 = db.prepare(
    "UPDATE reference SET " +
      Object.entries(record).map((e) => e[0] + " = ?").join(", ") +
      " WHERE id = ?",
  );
  if (stmt0.run([...Object.values(record), id]) !== 1) {
    ctx.res = new Response("UPDATE failed.", { status: 500 });
    return;
  }

  using stmt1 = db.prepare("SELECT * FROM reference WHERE id = ?");
  const select = stmt1.get(id);
  if (!select) {
    ctx.res = new Response("SELECT failed.", { status: 500 });
    return;
  }

  ctx.res = cborResponse(select);
};
