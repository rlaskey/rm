import { cborResponse } from "../../src/cbor-encode.ts";
import { Middleware } from "../../src/framework.ts";
import { db } from "../../src/sqlite.ts";

const getId = (path: string): bigint | null => {
  const prefix = "/2/article/";
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
