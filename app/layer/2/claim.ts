import { Middleware } from "../../src/framework.ts";
import { db } from "../../src/sqlite.ts";

export const claim: Middleware = (ctx, _) => {
  // We ONLY want this for cases where we have ZERO admins.
  using stmtC = db.prepare("SELECT COUNT(*) FROM user WHERE write = 1");
  if (stmtC.value()![0]) return;

  using stmt = db.prepare("UPDATE user SET write = 1 WHERE id = ?");
  if (stmt.run(ctx.state.user?.get("id")) !== 1) return;

  ctx.res = new Response(null, { status: 302, headers: { "Location": "/u" } });
};
