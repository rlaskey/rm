import { ulid } from "@std/ulid";

import { HttpError } from "fresh";

import { define } from "@/src/define.ts";
import {
  createChallenge,
  publicKeyCredentialCreationOptions,
} from "@/src/passkeys.ts";
import { blankSession } from "@/src/session.ts";
import { db } from "@/src/sqlite.ts";
import { User } from "@/src/user.ts";

export const handler = define.handlers({
  async POST({ state, req }) {
    if (!state.session) state.session = blankSession(req.headers);
    state.session.data.set("challenge", createChallenge());

    const user: User = new Map();
    if (state.session.user_id) {
      const existingUser = db.prepare("SELECT * FROM user WHERE id = ?").get(
        state.session.user_id,
      ) as object | undefined;
      if (!existingUser) {
        state.session.user_id = null;
        throw new HttpError(400);
      }
      Object.entries(existingUser).forEach((e) => user.set(e[0], e[1]));
    } else {
      const requestedName = (await req.json())["name"];
      if (!requestedName || typeof requestedName !== "string") {
        throw new HttpError(400);
      }
      user.set("id", ulid());
      user.set("name", requestedName);
      state.session.data.set("futureUser", user);
    }

    return Response.json(
      publicKeyCredentialCreationOptions(
        state.session.data.get("challenge") as string,
        user,
      ),
    );
  },
});
