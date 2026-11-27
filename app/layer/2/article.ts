import { type SupportedMapsCBOR } from "../../src/cbor.ts";
import { type Middleware } from "../../src/framework.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { client } from "../../src/sqlite.ts";
import { getId } from "../../src/url.ts";

export const getArticle: Middleware = async (ctx, _) => {
  const id = getId("/2/article/", ctx.url.pathname);
  if (!id) return;

  const a = (await client.execute("SELECT * FROM article WHERE id = ?", [id]))
    .rows[0];
  if (!a) return;
  const result: Record<string, unknown> = { article: a };

  // MAYBE: WHERE published IS NOT NULL
  result.references = (
    await client.execute(
      "SELECT r.id, r.name FROM article_reference ar " +
        "JOIN reference r ON ar.reference_id = r.id WHERE ar.article_id = ?",
      [id],
    )
  ).rows;

  result.articles = (
    await client.execute(
      "SELECT a.* FROM article_pair ap " +
        "JOIN article a ON a.id = ap.a WHERE ap.b = ? " +
        "UNION ALL " +
        "SELECT a.* FROM article_pair ap " +
        "JOIN article a ON a.id = ap.b WHERE ap.a = ?",
      [id, id],
    )
  ).rows;

  ctx.res = cborResponse(result);
};

export const searchArticle: Middleware = async (ctx, _) => {
  const req = cborDecode(await ctx.req.bytes()) as SupportedMapsCBOR;

  const omit = (req.get("omit") || []) as number[];
  const omitSQL = omit.length
    ? " AND id NOT IN (" + omit.map((_) => "?").join(", ") + ")"
    : "";

  const w = (("%" + req.get("q")) as string) + "%";
  ctx.res = cborResponse(
    (
      await client.execute(
        "SELECT id, published, SUBSTR(words, 0, 17) AS words, title " +
          "FROM article WHERE (id = ? OR title LIKE ? OR words LIKE ?)" +
          omitSQL,
        [req.get("q") as string, w, w, ...omit],
      )
    ).rows,
  );
};
