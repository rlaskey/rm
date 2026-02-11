import { type Middleware } from "../../../../src/framework.ts";

import {
  createChallenge,
  publicKeyCredentialRequestOptionsJSON,
} from "../../../../src/passkeys.ts";
import { blankSession } from "../../../../src/session.ts";

export const get0: Middleware = (ctx, _) => {
  if (!ctx.state.session) ctx.state.session = blankSession(ctx.req.headers);

  ctx.state.session.data.set("challenge", createChallenge());

  ctx.res = Response.json(publicKeyCredentialRequestOptionsJSON(
    ctx.state.session.data.get("challenge") as string,
  ));
};
