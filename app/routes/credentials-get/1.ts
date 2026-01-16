import { HttpError } from "fresh";

import { define } from "@/src/define.ts";
import {
  ALGORITHMS,
  decodeAuthenticatorData,
  decodeClientDataJSON,
  deletePasskey,
  Passkey,
  publicKeyCredentialRequestOptionsJSON,
} from "@/src/passkeys.ts";
import { db } from "@/src/sqlite.ts";
import { User } from "@/src/user.ts";

export const handler = define.handlers({
  async POST({ state, req }) {
    // Session should be set at this point. Something is wrong.
    if (!state.session) throw new HttpError(400);
    if (!state.session.data.challenge) throw new HttpError(400);

    const publicKeyCredentialJSON: PublicKeyCredentialJSON = await req
      .json();
    const passkey = db.prepare("SELECT * FROM passkey WHERE id = ?").get(
      publicKeyCredentialJSON.id,
    ) as Passkey | undefined;
    if (!passkey) throw new HttpError(400, "Passkey not found.");
    // https://w3c.github.io/webauthn/#sctn-verifying-assertion

    const algorithm = ALGORITHMS.get(passkey.alg);
    if (typeof algorithm === "undefined") {
      throw new Error(
        "Bad algorithm in a stored Passkey. This does not make a lot of sense.",
      );
    }

    if (
      !await algorithm.verify(
        passkey.public_key,
        publicKeyCredentialJSON.response.signature,
        publicKeyCredentialJSON.response.authenticatorData,
        publicKeyCredentialJSON.response.clientDataJSON,
      )
    ) {
      throw new HttpError(400, "Verification failed.");
    }

    state.user = db.prepare("SELECT * FROM user WHERE id = ?").get(
      passkey.user_id,
    ) as User | undefined;
    if (!state.user) {
      deletePasskey(publicKeyCredentialJSON.id);
      throw new HttpError(
        400,
        "Passkey was associated with a deleted User account.",
      );
    }

    const C = decodeClientDataJSON(
      publicKeyCredentialJSON.response.clientDataJSON,
    );
    if (C.type !== "webauthn.get") throw new HttpError(400, "C.type");
    if (C.challenge !== state.session.data.challenge) {
      throw new HttpError(400, "C.challenge");
    }

    const options = publicKeyCredentialRequestOptionsJSON(
      state.session.data.challenge,
    );

    if ((new URL(C.origin)).hostname !== options.rpId) {
      throw new HttpError(400, "clientData.origin");
    }
    // TODO: anything to do w/ crossOrigin or topOrigin

    const authenticatorData = decodeAuthenticatorData(
      publicKeyCredentialJSON.response.authenticatorData,
    );
    if (
      authenticatorData.rpId !== (new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          (new TextEncoder()).encode(options.rpId),
        ),
      )).toBase64({ alphabet: "base64url" })
    ) {
      throw new HttpError(400, "authenticatorData.rpId");
    }
    if (!authenticatorData.flags.userPresent) {
      throw new HttpError(
        400,
        "authenticatorData.flags.userPresent is not set.",
      );
    }
    if (
      options.userVerification === "required" &&
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

    state.session.user_id = state.user.id;

    delete state.session.data.challenge;
    delete state.session.data.futureUser;

    return new Response();
  },
});
