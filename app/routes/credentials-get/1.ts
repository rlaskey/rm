import { HttpError } from "fresh";

import { define } from "@/src/define.ts";
import {
  ALGORITHMS,
  decodeAuthenticatorData,
  decodeClientDataJSON,
  deletePasskey,
  getPasskey,
  publicKeyCredentialRequestOptionsJSON,
} from "@/src/passkeys.ts";
import { getUser } from "@/src/user.ts";

export const handler = define.handlers({
  async POST({ state, req }) {
    // Session should be set at this point. Something is wrong.
    if (state.session === null) throw new HttpError(400);
    if (!state.session.challenge) throw new HttpError(400);

    const publicKeyCredentialJSON: PublicKeyCredentialJSON = await req
      .json();
    const passkey = await getPasskey(publicKeyCredentialJSON.id);
    if (passkey === null) throw new HttpError(400, "Passkey not found.");
    // https://w3c.github.io/webauthn/#sctn-verifying-assertion

    const algorithm = ALGORITHMS.get(passkey.alg);
    if (typeof algorithm === "undefined") {
      throw new Error(
        "Bad algorithm in a stored Passkey. This does not make a lot of sense.",
      );
    }

    if (
      !await algorithm.verify(
        passkey.publicKey,
        publicKeyCredentialJSON.response.signature,
        publicKeyCredentialJSON.response.authenticatorData,
        publicKeyCredentialJSON.response.clientDataJSON,
      )
    ) {
      throw new HttpError(400, "Verification failed.");
    }

    const user = await getUser(passkey.userId);
    if (user === null) {
      await deletePasskey(publicKeyCredentialJSON.id);
      throw new HttpError(
        400,
        "Passkey was associated with a deleted User account.",
      );
    }

    const C = decodeClientDataJSON(
      publicKeyCredentialJSON.response.clientDataJSON,
    );
    if (C.type !== "webauthn.get") throw new HttpError(400, "C.type");
    if (C.challenge !== state.session.challenge) {
      throw new HttpError(400, "C.challenge");
    }

    const options = publicKeyCredentialRequestOptionsJSON(
      state.session.challenge,
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

    state.session.userId = passkey.userId;
    if (user.write) state.session.write = true;
    state.session.save = true;

    delete state.session.challenge;
    delete state.session.futureUser;

    return new Response();
  },
});
