import { cborResponse } from "../../src/cbor-encode.ts";
import { Middleware } from "../../src/framework.ts";
import { db } from "../../src/sqlite.ts";

export const articleDrafts: Middleware = (ctx, _) => {
  using stmt = db.prepare(
    "SELECT id, title, SUBSTR(words, 0, 43) AS words " +
      "FROM article WHERE published IS NULL ORDER BY id LIMIT 43",
  );
  ctx.res = cborResponse(stmt.all());
};

export const articlePublished: Middleware = (ctx, _) => {
  using stmt = db.prepare(
    "SELECT id, published, title, SUBSTR(words, 0, 43) AS words " +
      "FROM article WHERE published IS NOT NULL " +
      "ORDER BY published DESC LIMIT 43",
  );
  ctx.res = cborResponse(stmt.all());
};

export const references: Middleware = (ctx, _) => {
  using stmt = db.prepare(
    "SELECT * FROM reference ORDER BY id DESC LIMIT 43",
  );
  ctx.res = cborResponse(stmt.all());
};
