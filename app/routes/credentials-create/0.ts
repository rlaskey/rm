import { define } from "@/src/define.ts";
import {
  createChallenge,
  publicKeyCredentialCreationOptions,
} from "@/src/passkeys.ts";
import { newSession } from "@/src/session.ts";
import { blankUserKV } from "@/src/user.ts";

export const handler = define.handlers({
  async POST(ctx) {
    if (!ctx.state.sessionKV) ctx.state.sessionKV = newSession(ctx.req.headers);
    ctx.state.sessionKV.value.authenticating = {
      challenge: createChallenge(),
      newUserKV: null,
    };

    let userKV = ctx.state.sessionKV.value.userKV;
    if (userKV === null) {
      userKV = blankUserKV((await ctx.req.json())["name"]);
      ctx.state.sessionKV.value.authenticating.newUserKV = userKV;
    }

    return Response.json(
      publicKeyCredentialCreationOptions(
        ctx.state.sessionKV.value.authenticating.challenge,
        userKV,
      ),
    );
  },
});
