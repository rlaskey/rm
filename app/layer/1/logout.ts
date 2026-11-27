import { type Middleware } from "../../src/framework.ts";

import { client } from "../../src/sqlite.ts";

export const logout: Middleware = async (ctx, _) => {
  if (ctx.state.session) {
    await client.execute({
      sql: "DELETE FROM session WHERE id = ?",
      args: [ctx.state.session.id],
    });
  }

  // Set up the session middleware to delete the cookie.
  ctx.state.session = undefined;
  ctx.res = new Response(null, {
    status: 302,
    headers: { Location: "/login" },
  });
};
