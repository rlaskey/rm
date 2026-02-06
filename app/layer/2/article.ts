import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { SupportedMapsCBOR } from "../../src/cbor.ts";
import { Middleware } from "../../src/framework.ts";
import { db } from "../../src/sqlite.ts";
import { getId } from "../../src/url.ts";

export const getArticle: Middleware = (ctx, _) => {
  const id = getId("/2/article/", ctx.url.pathname);
  if (!id) return;

  using stmt = db.prepare("SELECT * FROM article WHERE id = ?");
  const r = stmt.get(id);
  if (!r) return;

  ctx.res = cborResponse(r);
};

export const searchArticle: Middleware = async (ctx, _) => {
  const req = cborDecode(await ctx.req.bytes()) as SupportedMapsCBOR;

  const omit = (req.get("omit") || []) as number[];
  const omitSQL = (omit.length)
    ? " AND id NOT IN (" + omit.map((_) => "?").join(", ") + ")"
    : "";

  using stmt = db.prepare(
    "SELECT id, SUBSTR(words, 17) AS words, title FROM article " +
      "WHERE (id = ? OR title LIKE ? OR words LIKE ?)" + omitSQL,
  );

  const w = "%" + req.get("q") as string + "%";
  ctx.res = cborResponse(
    stmt.all([...[req.get("q") as string, w, w], ...omit]),
  );
};
