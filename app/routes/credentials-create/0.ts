import { ulid } from "@std/ulid";

import { HttpError } from "fresh";

import { define } from "@/src/define.ts";
import {
  createChallenge,
  publicKeyCredentialCreationOptions,
} from "@/src/passkeys.ts";
import { blankSession } from "@/src/session.ts";
import { db } from "@/src/sqlite.ts";
import { FutureUser, User } from "@/src/user.ts";

export const handler = define.handlers({
  async POST({ state, req }) {
    if (!state.session) state.session = blankSession(req.headers);
    state.session.data.challenge = createChallenge();

    let user: User | FutureUser = {
      id: ulid(),
      name: "LARRY",
    };
    if (state.session.user_id) {
      const existingUser = db.prepare("SELECT * FROM user WHERE id = ?").get(
        state.session.user_id,
      ) as User | undefined;
      if (!existingUser) {
        state.session.user_id = null;
        throw new HttpError(400);
      }
      user = existingUser;
    } else {
      const requestedName = (await req.json())["name"];
      if (!requestedName || typeof requestedName !== "string") {
        throw new HttpError(400);
      }
      user.name = requestedName;
      state.session.data.futureUser = {
        id: user.id,
        name: user.name,
      };
    }

    return Response.json(
      publicKeyCredentialCreationOptions(
        state.session.data.challenge,
        user,
      ),
    );
  },
});
