import { define } from "@/src/define.ts";
import {
  createChallenge,
  publicKeyCredentialCreationOptions,
} from "@/src/passkeys.ts";
import { newSession } from "@/src/session.ts";
import { blankUserKV } from "@/src/user.ts";

export const handler = define.handlers({
  async POST({ state, req }) {
    if (!state.sessionKV) state.sessionKV = newSession(req.headers);
    state.sessionKV.value.authenticating = {
      challenge: createChallenge(),
      newUserKV: null,
    };

    let userKV = state.sessionKV.value.userKV;
    if (userKV === null) {
      userKV = blankUserKV((await req.json())["name"]);
      state.sessionKV.value.authenticating.newUserKV = userKV;
    }

    return Response.json(
      publicKeyCredentialCreationOptions(
        state.sessionKV.value.authenticating.challenge,
        userKV,
      ),
    );
  },
});
