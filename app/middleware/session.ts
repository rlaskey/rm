import { deleteCookie, setCookie } from "@std/http";

import { cborEncode } from "@/src/cbor-encode.ts";
import { define } from "@/src/define.ts";
import { COOKIE_NAME } from "@/src/session.ts";
import { db } from "@/src/sqlite.ts";
import { getState } from "@/src/state.ts";

const replacer = (_: string, v: object) => {
  if (v instanceof Map) return Array.from(v.entries());
  return v;
};

export const session = define.middleware(async (ctx) => {
  Object.assign(ctx.state, getState(ctx.req.headers));
  const start = JSON.stringify(ctx.state.session, replacer);

  const response = await ctx.next();

  if (!ctx.state.session) {
    // We had a session at the start of the request. Now, we don't.
    if (start) deleteCookie(response.headers, COOKIE_NAME);
  } else if (JSON.stringify(ctx.state.session, replacer) !== start) {
    const data = cborEncode(ctx.state.session.data);
    ctx.state.session.updated_at = Date.now();

    if (!start) {
      db.prepare("INSERT INTO session VALUES (?, ?, ?, ?)").run(
        ctx.state.session.id,
        data,
        ctx.state.session.updated_at,
        ctx.state.session.user_id,
      );
    } else {
      db.prepare(
        "UPDATE session SET data = ?, updated_at = ?, user_id = ? " +
          "WHERE id = ?",
      ).run(
        data,
        ctx.state.session.updated_at,
        ctx.state.session.user_id,
        ctx.state.session.id,
      );
    }

    setCookie(response.headers, {
      name: COOKIE_NAME,
      value: ctx.state.session.id,
      sameSite: "Strict",
      secure: true,
      path: "/",
      httpOnly: true,
    });
  }

  return response;
});
