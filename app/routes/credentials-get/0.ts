import { define } from "@/src/define.ts";
import {
  createChallenge,
  publicKeyCredentialRequestOptionsJSON,
} from "@/src/passkeys.ts";
import { newSession } from "@/src/session.ts";

export const handler = define.handlers({
  GET(ctx) {
    if (!ctx.state.sessionKV) ctx.state.sessionKV = newSession(ctx.req.headers);
    ctx.state.sessionKV.value.authenticating = {
      challenge: createChallenge(),
      newUserKV: null,
    };

    return Response.json(
      publicKeyCredentialRequestOptionsJSON(
        ctx.state.sessionKV.value.authenticating.challenge,
      ),
    );
  },
});
