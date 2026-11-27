import { type Middleware } from "../../src/framework.ts";
import { deleteCookie, setCookie } from "../../src/cookies.ts";

import { equalUint8Arrays } from "../../src/bytes.ts";
import { cborEncode } from "../../src/cbor-encode.ts";
import { COOKIE_NAME, timestampSeconds } from "../../src/session.ts";
import { client } from "../../src/sqlite.ts";
import { getState } from "../../src/state.ts";

const SECONDS_IN_DAY = 60 * 60 * 24;
const MAX_AGE_DAYS = 79;
const NO_SESSION = cborEncode(undefined);

export const session: Middleware = async (ctx, next) => {
  Object.assign(ctx.state, await getState(ctx.req.headers));
  const start = cborEncode(ctx.state.session);

  await next();

  if (!ctx.state.session) {
    // We had a session at the start of the request. Now, we don't.
    if (!equalUint8Arrays(start, NO_SESSION))
      deleteCookie(ctx.res.headers, COOKIE_NAME);
    return;
  }

  const now = timestampSeconds();
  if (now - ctx.state.session.updated_at > SECONDS_IN_DAY * 7) {
    ctx.state.session.updated_at = now;
  }

  if (equalUint8Arrays(cborEncode(ctx.state.session), start)) {
    return;
  }

  const data = cborEncode(ctx.state.session.data);

  if (equalUint8Arrays(start, NO_SESSION)) {
    await client.execute({
      sql: "INSERT INTO session VALUES (?, ?, ?, ?)",
      args: [
        ctx.state.session.id,
        data,
        ctx.state.session.updated_at,
        ctx.state.session.user_id,
      ],
    });
  } else {
    await client.execute({
      sql:
        "UPDATE session SET data = ?, updated_at = ?, user_id = ? " +
        "WHERE id = ?",
      args: [
        data,
        ctx.state.session.updated_at,
        ctx.state.session.user_id,
        ctx.state.session.id,
      ],
    });
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
