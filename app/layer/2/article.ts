import { type SupportedMapsCBOR } from "../../src/cbor.ts";
import { type Middleware } from "../../src/framework.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { db } from "../../src/sqlite.ts";
import { getId } from "../../src/url.ts";

export const getArticle: Middleware = (ctx, _) => {
  const id = getId("/2/article/", ctx.url.pathname);
  if (!id) return;

  using stmt0 = db.prepare("SELECT * FROM article WHERE id = ?");
  const a = stmt0.get(id);
  if (!a) return;
  const result: Record<string, unknown> = { article: a };

  // MAYBE: WHERE published IS NOT NULL
  using stmt1 = db.prepare(
    "SELECT r.id, r.name FROM article_reference ar " +
      "JOIN reference r ON ar.reference_id = r.id WHERE ar.article_id = ?",
  );
  result.references = stmt1.all(id);

  using stmt2 = db.prepare(
    "SELECT a.* FROM article_pair ap " +
      "JOIN article a ON a.id = ap.a WHERE ap.b = ? " + "UNION ALL " +
      "SELECT a.* FROM article_pair ap " +
      "JOIN article a ON a.id = ap.b WHERE ap.a = ?",
  );
  result.articles = stmt2.all(id, id);

  ctx.res = cborResponse(result);
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
