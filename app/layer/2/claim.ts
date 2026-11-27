import { type Middleware } from "../../src/framework.ts";

import { client } from "../../src/sqlite.ts";

export const claim: Middleware = async (ctx, _) => {
  // We ONLY want this for cases where we have ZERO admins.
  const c = (
    await client.execute("SELECT COUNT(*) as c FROM user WHERE write = 1")
  ).rows[0]?.c;
  if (c) {
    return;
  }

  if (
    (
      await client.execute({
        sql: "UPDATE user SET write = 1 WHERE id = ?",
        args: [(ctx.state.user?.get("id") as bigint) ?? null],
      })
    ).rowsAffected != 1
  )
    return;

  ctx.res = new Response(null, { status: 302, headers: { Location: "/u" } });
};
