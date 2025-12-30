import { define } from "@/src/define.ts";
import {
  createChallenge,
  publicKeyCredentialRequestOptionsJSON,
} from "@/src/passkeys.ts";
import { newSession } from "@/src/session.ts";

export const handler = define.handlers({
  GET({ state, req }) {
    if (!state.sessionKV) state.sessionKV = newSession(req.headers);
    state.sessionKV.value.authenticating = {
      challenge: createChallenge(),
      newUserKV: null,
    };

    return Response.json(
      publicKeyCredentialRequestOptionsJSON(
        state.sessionKV.value.authenticating.challenge,
      ),
    );
  },
});
