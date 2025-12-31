import { ulid } from "@std/ulid";

import { HttpError } from "fresh";

import { define } from "@/src/define.ts";
import {
  createChallenge,
  publicKeyCredentialCreationOptions,
} from "@/src/passkeys.ts";
import { emptySession } from "@/src/session.ts";
import { AuthenticatedUser, getUser } from "@/src/user.ts";

export const handler = define.handlers({
  async POST({ state, req }) {
    if (!state.session) state.session = emptySession(req.headers);
    state.session.challenge = createChallenge();
    state.session.save = true;

    let user: AuthenticatedUser = {
      id: ulid(),
      name: "LARRY",
      passkeys: new Set(),
    };
    if (state.session.userId) {
      const existingUser = await getUser(state.session.userId);
      if (!existingUser) {
        delete state.session.userId;
        throw new HttpError(400);
      }
      user = existingUser;
    } else {
      const requestedName = (await req.json())["name"];
      if (!requestedName || typeof requestedName !== "string") {
        throw new HttpError(400);
      }
      user.name = requestedName;
      state.session.futureUser = user;
    }

    return Response.json(
      publicKeyCredentialCreationOptions(
        state.session.challenge,
        user,
      ),
    );
  },
});
