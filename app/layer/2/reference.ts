import { type SupportedMapsCBOR } from "../../src/cbor.ts";
import { type Middleware } from "../../src/framework.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { db } from "../../src/sqlite.ts";
import { getId } from "../../src/url.ts";

export const getReference: Middleware = (ctx, _) => {
  const id = getId("/2/reference/", ctx.url.pathname);
  if (!id) return;

  const r = db.prepare("SELECT * FROM reference WHERE id = ?").get(id);
  if (!r) return;
  const result: Record<string, unknown> = { reference: r };

  result.labeledURLs = db.prepare(
    "SELECT * FROM url WHERE reference_id = ?",
  ).all(id);

  // MAYBE: WHERE published IS NOT NULL
  result.articles = db.prepare(
    "SELECT a.id, a.published, a.title, SUBSTR(a.words, 0, 43) AS words " +
      "FROM article_reference ar " +
      "JOIN article a ON ar.article_id = a.id WHERE ar.reference_id = ?",
  ).all(id);

  result.references = db.prepare(
    "SELECT r.* FROM reference_pair rp " +
      "JOIN reference r ON r.id = rp.a WHERE rp.b = ? " + "UNION ALL " +
      "SELECT r.* FROM reference_pair rp " +
      "JOIN reference r ON r.id = rp.b WHERE rp.a = ?",
  ).all(id, id);

  ctx.res = cborResponse(result);
};

export const searchReference: Middleware = async (ctx, _) => {
  const req = cborDecode(await ctx.req.bytes()) as SupportedMapsCBOR;

  const omit = (req.get("omit") || []) as number[];
  const omitSQL = (omit.length)
    ? " AND id NOT IN (" + omit.map((_) => "?").join(", ") + ")"
    : "";

  const w = "%" + req.get("q") as string + "%";
  ctx.res = cborResponse(
    db.prepare(
      "SELECT id, name FROM reference WHERE (id = ? OR name LIKE ?)" + omitSQL,
    ).all(req.get("q") as string, w, ...omit),
  );
};
