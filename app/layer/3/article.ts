import { Article } from "../../browser/data.ts";
import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { Middleware } from "../../src/framework.ts";
import { db } from "../../src/sqlite.ts";

export const insertArticle: Middleware = async (ctx, _) => {
  const r = cborDecode(await ctx.req.bytes());
  if (!(r instanceof Map)) {
    ctx.res = new Response("Bad input.", { status: 400 });
    return;
  }

  const record: Record<string, string | bigint | null> = {};
  Article.schema.forEach((c) => {
    if (c.options.has("autoincrement")) return;
    const v = r.get(c.name) as string | bigint | null;
    if (c.options.has("null") && !v) return;
    record[c.name] = v;
  });
  if (!Object.keys(record).length) {
    ctx.res = new Response("Empty record.", { status: 500 });
    return;
  }

  using stmt = db.prepare(
    "INSERT INTO article (" + Object.keys(record).join(", ") + ") VALUES (" +
      Object.keys(record).map((_) => "?").join(", ") + ")",
  );
  if (stmt.run(Object.values(record)) !== 1) {
    ctx.res = new Response("INSERT failed.", { status: 500 });
    return;
  }

  ctx.res = cborResponse(db.lastInsertRowId);
};

const getId = (path: string): bigint | null => {
  const prefix = "/3/article/";
  if (!path.startsWith(prefix)) return null;
  return BigInt(path.substring(prefix.length));
};

export const getArticle: Middleware = (ctx, _) => {
  const id = getId(ctx.url.pathname);
  if (!id) return;

  using stmt = db.prepare("SELECT * FROM article WHERE id = ?");
  const r = stmt.get(id);
  if (!r) return;

  ctx.res = cborResponse(r);
};

export const updateArticle: Middleware = async (ctx, _) => {
  const id = getId(ctx.url.pathname);
  if (!id) return;

  const r = cborDecode(await ctx.req.bytes());
  if (!(r instanceof Map)) {
    ctx.res = new Response("Bad input.", { status: 400 });
    return;
  }

  const record: Record<string, string | bigint | null> = {};
  Article.schema.forEach((c) => {
    if (c.options.has("autoincrement")) return;
    const v = r.get(c.name) as string | bigint | null;
    if (c.options.has("null") && !v) return;
    record[c.name] = v;
  });
  if (!Object.keys(record).length) {
    ctx.res = new Response("Empty record.", { status: 500 });
    return;
  }

  using stmt = db.prepare(
    "UPDATE article SET " +
      Object.entries(record).map((e) => e[0] + " = ?").join(", ") +
      " WHERE id = ?",
  );
  if (stmt.run([...Object.values(record), id]) !== 1) {
    ctx.res = new Response("UPDATE failed.", { status: 500 });
    return;
  }

  ctx.res = cborResponse("Saved.");
};
