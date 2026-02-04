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

export const getURLs: Middleware = (ctx, _) => {
  const referenceId = getId("/2/urls/", ctx.url.pathname);
  using stmt = db.prepare("SELECT id, label FROM url WHERE reference_id = ?");
  ctx.res = cborResponse(stmt.all(referenceId));
};
