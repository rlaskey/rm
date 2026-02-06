import { cborResponse } from "../../src/cbor-encode.ts";
import { Middleware } from "../../src/framework.ts";
import { db } from "../../src/sqlite.ts";
import { getId } from "../../src/url.ts";

export const getReference: Middleware = (ctx, _) => {
  const id = getId("/2/reference/", ctx.url.pathname);
  if (!id) return;

  using stmt0 = db.prepare("SELECT * FROM reference WHERE id = ?");
  const r = stmt0.get(id);
  if (!r) return;
  const result: Record<string, unknown> = { reference: r };

  using stmt1 = db.prepare("SELECT id, label FROM url WHERE reference_id = ?");
  result.labeledURLs = stmt1.all(id);

  // MAYBE: WHERE published IS NOT NULL
  using stmt2 = db.prepare(
    "SELECT a.id, a.published, a.title FROM article_reference ar " +
      "JOIN article a ON ar.article_id = a.id WHERE ar.reference_id = ?",
  );
  result.articles = stmt2.all(id);

  using stmt3 = db.prepare(
    "SELECT r.* FROM reference_pair rp " +
      "JOIN reference r ON r.id = rp.a WHERE rp.b = ? " + "UNION ALL " +
      "SELECT r.* FROM reference_pair rp " +
      "JOIN reference r ON r.id = rp.b WHERE rp.a = ?",
  );
  result.references = stmt3.all(id, id);

  ctx.res = cborResponse(result);
};
