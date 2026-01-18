import { HttpError } from "fresh";

import { define } from "@/src/define.ts";
import {
  decodeAuthenticatorData,
  decodeClientDataJSON,
  insertPasskey,
  publicKeyCredentialCreationOptions,
} from "@/src/passkeys.ts";
import { db } from "@/src/sqlite.ts";
import { User } from "@/src/user.ts";

export const handler = define.handlers({
  // Verify Registration Response
  async POST({ state, req }) {
    // Session should be set at this point. Something is wrong.
    if (!state.session) throw new HttpError(400);
    if (!state.session.data.get("challenge")) throw new HttpError(400);

    const user = new Map() as User;
    if (state.session.data.get("futureUser")) {
      (state.session.data.get("futureUser") as User).forEach((v, k) =>
        user.set(k, v)
      );
    } else {
      if (!state.session.user_id) throw new HttpError(400);
      const existingUser = db.prepare("SELECT * FROM user WHERE id = ?").get(
        state.session.user_id,
      ) as object | undefined;
      if (!existingUser) {
        state.session.user_id = null;
        throw new HttpError(400);
      }

      Object.entries(existingUser).forEach((e) => user.set(e[0], e[1]));
    }

    const publicKeyCredentialJSON: PublicKeyCredentialJSON = await req
      .json();
    const response = publicKeyCredentialJSON.response;
    const clientData = decodeClientDataJSON(response.clientDataJSON);

    // https://w3c.github.io/webauthn/#sctn-registering-a-new-credential
    if (clientData.type !== "webauthn.create") {
      throw new HttpError(400, "clientData.type");
    }
    if (clientData.challenge !== state.session.data.get("challenge")) {
      throw new HttpError(400, "clientData.challenge");
    }

    // Re-create the options so we can compare.
    // This is deterministic: the same challenge + user gets the same results.
    const options = publicKeyCredentialCreationOptions(
      state.session.data.get("challenge") as string,
      user,
    );

    if ((new URL(clientData.origin)).hostname !== options.rp.id) {
      throw new HttpError(400, "clientData.origin");
    }
    // TODO: anything to do w/ crossOrigin or topOrigin

    const authenticatorData = decodeAuthenticatorData(
      response.authenticatorData,
    );
    if (
      authenticatorData.rpId !== (new Uint8Array(
        await crypto.subtle
          .digest("SHA-256", (new TextEncoder()).encode(options.rp.id)),
      )).toBase64({ alphabet: "base64url" })
    ) throw new HttpError(400, "authenticatorData.rpId");
    if (!authenticatorData.flags.userPresent) {
      throw new HttpError(
        400,
        "authenticatorData.flags.userPresent is not set. " +
          "We are not supporting `conditional` mediation.",
      );
    }

    if (
      options.authenticatorSelection?.userVerification === "required" &&
      !authenticatorData.flags.userVerified
    ) throw new HttpError(400, "authenticatorData.flags.userVerified");
    if (
      !authenticatorData.flags.backupEligibility &&
      authenticatorData.flags.backupState
    ) {
      throw new HttpError(
        400,
        "backup is not eligible, but we have a backup. Something is off.",
      );
    }

    if (
      !options.pubKeyCredParams.some((e) =>
        e.alg === response.publicKeyAlgorithm
      )
    ) throw new HttpError(400, "response.publicKeyAlgorithm");

    // Convert a FutureUser to a User.
    if (typeof user.get("id") === "string") {
      const insertUserResult = db.prepare("INSERT INTO user (name) VALUES (?)")
        .run(user.get("name") as string);
      if (insertUserResult.changes !== 1) {
        throw new HttpError(400, "Issue creating User.");
      }
      user.set("id", insertUserResult.lastInsertRowid);
    }

    if (
      insertPasskey({
        id: publicKeyCredentialJSON.id,
        alg: publicKeyCredentialJSON.response.publicKeyAlgorithm,
        public_key: publicKeyCredentialJSON.response.publicKey,
        user_id: user.get("id") as number | bigint,
      }).changes !== 1
    ) throw new HttpError(400);

    state.session.user_id = user.get("id") as number | bigint;

    state.session.data.delete("challenge");
    state.session.data.delete("futureUser");

    return new Response();
  },
});
