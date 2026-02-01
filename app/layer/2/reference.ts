import { cborResponse } from "../../src/cbor-encode.ts";
import { Middleware } from "../../src/framework.ts";
import { db } from "../../src/sqlite.ts";
import { getId } from "../../src/url.ts";

export const getReference: Middleware = (ctx, _) => {
  const id = getId("/2/reference/", ctx.url.pathname);
  if (!id) return;

  using stmt = db.prepare("SELECT * FROM reference WHERE id = ?");
  const r = stmt.get(id);
  if (!r) return;

  ctx.res = cborResponse(r);
};
