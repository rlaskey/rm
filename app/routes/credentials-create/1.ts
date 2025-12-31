import { HttpError } from "fresh";

import { define } from "@/src/define.ts";
import {
  decodeAuthenticatorData,
  decodeClientDataJSON,
  publicKeyCredentialCreationOptions,
  setPasskey,
} from "@/src/passkeys.ts";
import { getUser, setUser } from "@/src/user.ts";

export const handler = define.handlers({
  // Verify Registration Response
  async POST({ state, req }) {
    // Session should be set at this point. Something is wrong.
    if (state.session === null) throw new HttpError(400);
    if (!state.session.challenge) throw new HttpError(400);

    // Find the User.
    let user = state.session.futureUser || null;
    if (!user) {
      if (!state.session.userId) throw new HttpError(400);
      user = await getUser(state.session.userId);
      if (!user) {
        delete state.session.userId;
        state.session.save = true;
        throw new HttpError(400);
      }
    }

    const publicKeyCredentialJSON: PublicKeyCredentialJSON = await req
      .json();
    const response = publicKeyCredentialJSON.response;
    const clientData = decodeClientDataJSON(response.clientDataJSON);

    // https://w3c.github.io/webauthn/#sctn-registering-a-new-credential
    if (clientData.type !== "webauthn.create") {
      throw new HttpError(400, "clientData.type");
    }
    if (clientData.challenge !== state.session.challenge) {
      throw new HttpError(400, "clientData.challenge");
    }

    // Re-create the options so we can compare.
    // This is deterministic: the same challenge + user gets the same results.
    const options = publicKeyCredentialCreationOptions(
      state.session.challenge,
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

    if (
      !(await setPasskey({
        id: publicKeyCredentialJSON.id,
        alg: publicKeyCredentialJSON.response.publicKeyAlgorithm,
        publicKey: publicKeyCredentialJSON.response.publicKey,
        userId: user.id,
      })).ok
    ) throw new HttpError(400);

    user.passkeys.add(publicKeyCredentialJSON.id);
    if (!(await setUser(user)).ok) throw new HttpError(500);

    state.session.userId = user.id;
    state.session.save = true;

    delete state.session.challenge;
    if (state.session.futureUser) delete state.session.futureUser;

    return new Response();
  },
});
