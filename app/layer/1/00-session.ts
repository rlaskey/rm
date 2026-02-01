import { deleteCookie, setCookie } from "@std/http";

import { cborEncode } from "../../src/cbor-encode.ts";
import { Middleware } from "../../src/framework.ts";
import { COOKIE_NAME, timestampSeconds } from "../../src/session.ts";
import { db } from "../../src/sqlite.ts";
import { getState } from "../../src/state.ts";

const SECONDS_IN_DAY = 60 * 60 * 24;
const MAX_AGE_DAYS = 79;

const replacer = (_: string, v: object) => {
  if (v instanceof Map) return Array.from(v.entries());
  return v;
};

export const session: Middleware = async (ctx, next) => {
  Object.assign(ctx.state, getState(ctx.req.headers));
  const start = JSON.stringify(ctx.state.session, replacer);

  await next();

  if (!ctx.state.session) {
    // We had a session at the start of the request. Now, we don't.
    if (start) deleteCookie(ctx.res.headers, COOKIE_NAME);
    return;
  }

  const now = timestampSeconds();
  if ((now - ctx.state.session.updated_at) > SECONDS_IN_DAY * 7) {
    ctx.state.session.updated_at = now;
  }

  if (JSON.stringify(ctx.state.session, replacer) === start) {
    return;
  }

  const data = cborEncode(ctx.state.session.data);

  if (!start) {
    using stmt = db.prepare("INSERT INTO session VALUES (?, ?, ?, ?)");
    stmt.run(
      ctx.state.session.id,
      data,
      ctx.state.session.updated_at,
      ctx.state.session.user_id,
    );
  } else {
    using stmt = db.prepare(
      "UPDATE session SET data = ?, updated_at = ?, user_id = ? " +
        "WHERE id = ?",
    );
    stmt.run(
      data,
      ctx.state.session.updated_at,
      ctx.state.session.user_id,
      ctx.state.session.id,
    );
  }

  setCookie(ctx.res.headers, {
    name: COOKIE_NAME,
    value: ctx.state.session.id,
    maxAge: SECONDS_IN_DAY * MAX_AGE_DAYS,
    sameSite: "Strict",
    secure: true,
    path: "/",
    httpOnly: true,
  });
};
