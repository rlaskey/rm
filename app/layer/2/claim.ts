import { type Middleware } from "../../src/framework.ts";

import { db } from "../../src/sqlite.ts";

export const claim: Middleware = (ctx, _) => {
  // We ONLY want this for cases where we have ZERO admins.
  if (db.prepare("SELECT COUNT(*) as c FROM user WHERE write = 1").get()?.c) {
    return;
  }

  if (
    db.prepare("UPDATE user SET write = 1 WHERE id = ?").run(
      ctx.state.user?.get("id") as bigint ?? null,
    ).changes != 1
  ) return;

  ctx.res = new Response(null, { status: 302, headers: { "Location": "/u" } });
};
