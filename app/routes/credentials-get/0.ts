import { define } from "@/src/define.ts";
import {
  createChallenge,
  publicKeyCredentialRequestOptionsJSON,
} from "@/src/passkeys.ts";
import { emptySession } from "@/src/session.ts";

export const handler = define.handlers({
  GET({ state, req }) {
    if (!state.session) state.session = emptySession(req.headers);

    state.session.challenge = createChallenge();
    state.session.save = true;

    return Response.json(
      publicKeyCredentialRequestOptionsJSON(state.session.challenge),
    );
  },
});
