import { cborResponse } from "../../src/cbor-encode.ts";
import { Middleware } from "../../src/framework.ts";
import { db } from "../../src/sqlite.ts";

export const articleDrafts: Middleware = (ctx, _) => {
  using stmt0 = db.prepare(
    "SELECT id, title, SUBSTR(markdown, 0, 43) AS markdown " +
      "FROM article WHERE published IS NULL ORDER BY id LIMIT 43",
  );
  ctx.res = cborResponse(stmt0.all());
};

export const articlePublished: Middleware = (ctx, _) => {
  using stmt0 = db.prepare(
    "SELECT id, published, title, SUBSTR(markdown, 0, 43) AS markdown " +
      "FROM article WHERE published IS NOT NULL " +
      "ORDER BY published DESC LIMIT 43",
  );
  ctx.res = cborResponse(stmt0.all());
};
