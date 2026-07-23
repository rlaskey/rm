import { type Middleware } from "../../src/framework.ts";

import { db } from "../../src/sqlite.ts";

export const logout: Middleware = (ctx, _) => {
  if (ctx.state.session) {
    db.prepare("DELETE FROM session WHERE id = ?").run(ctx.state.session.id);
  }

  // Set up the session middleware to delete the cookie.
  ctx.state.session = undefined;
  ctx.res = new Response(null, {
    status: 302,
    headers: { "Location": "/login" },
  });
};
