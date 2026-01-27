import { ulid } from "@std/ulid";

import { Middleware } from "../../../../src/framework.ts";
import {
  createChallenge,
  publicKeyCredentialCreationOptions,
} from "../../../../src/passkeys.ts";
import { blankSession } from "../../../../src/session.ts";
import { db } from "../../../../src/sqlite.ts";
import { User } from "../../../../src/user.ts";

export const create0: Middleware = async (ctx, _) => {
  if (!ctx.state.session) ctx.state.session = blankSession(ctx.req.headers);
  ctx.state.session.data.set("challenge", createChallenge());

  const user: User = new Map();
  if (ctx.state.session.user_id) {
    using stmt = db.prepare("SELECT * FROM user WHERE id = ?");
    const existingUser = stmt.get(ctx.state.session.user_id);
    if (!existingUser) {
      ctx.state.session.user_id = null;
      ctx.res = new Response("User not found.", { status: 400 });
      return;
    }

    Object.entries(existingUser).forEach((e) => user.set(e[0], e[1]));
  } else {
    const requestedName = (await ctx.req.json())["name"];
    if (!requestedName || typeof requestedName !== "string") {
      ctx.res = new Response("User not found.", { status: 400 });
      return;
    }

    user.set("id", ulid());
    user.set("name", requestedName);
    ctx.state.session.data.set("futureUser", user);
  }

  ctx.res = Response.json(
    publicKeyCredentialCreationOptions(
      ctx.state.session.data.get("challenge") as string,
      user,
    ),
  );
};
