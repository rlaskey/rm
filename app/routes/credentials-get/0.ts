import { define } from "@/src/define.ts";
import {
  createChallenge,
  publicKeyCredentialRequestOptionsJSON,
} from "@/src/passkeys.ts";
import { blankSession } from "@/src/session.ts";

export const handler = define.handlers({
  GET({ state, req }) {
    if (!state.session) state.session = blankSession(req.headers);

    state.session.data.set("challenge", createChallenge());

    return Response.json(publicKeyCredentialRequestOptionsJSON(
      state.session.data.get("challenge") as string,
    ));
  },
});
