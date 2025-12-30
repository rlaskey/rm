import { HttpError } from "fresh";

import { define } from "@/src/define.ts";
import {
  decodeAuthenticatorData,
  decodeClientDataJSON,
  publicKeyCredentialCreationOptions,
  storePasskeyKV,
} from "@/src/passkeys.ts";
import { storeUserKV } from "@/src/user.ts";

export const handler = define.handlers({
  // Verify Registration Response
  async POST(ctx) {
    // Session should be set at this point. Something is wrong.
    if (ctx.state.sessionKV === null) throw new HttpError(400);
    if (!ctx.state.sessionKV.value.authenticating) throw new HttpError(400);

    // Find the User: either one already logged in, OR one we're going to create.
    let userKV = ctx.state.sessionKV.value.userKV;
    if (userKV === null) {
      userKV = ctx.state.sessionKV.value.authenticating.newUserKV;
    }
    // This SHOULD never happen, but it's best to be careful.
    if (userKV === null) throw new HttpError(400);

    const publicKeyCredentialJSON: PublicKeyCredentialJSON = await ctx.req
      .json();
    const response = publicKeyCredentialJSON.response;
    const clientData = decodeClientDataJSON(response.clientDataJSON);

    // https://w3c.github.io/webauthn/#sctn-registering-a-new-credential
    if (clientData.type !== "webauthn.create") {
      throw new HttpError(400, "clientData.type");
    }
    if (
      clientData.challenge !==
        ctx.state.sessionKV.value.authenticating.challenge
    ) {
      throw new HttpError(400, "clientData.challenge");
    }

    // Re-create the options so we can compare.
    // This is deterministic: the same challenge + user gets the same results.
    const options = publicKeyCredentialCreationOptions(
      ctx.state.sessionKV.value.authenticating.challenge,
      userKV,
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

    await storePasskeyKV({
      key: publicKeyCredentialJSON.id,
      value: {
        alg: publicKeyCredentialJSON.response.publicKeyAlgorithm,
        publicKey: publicKeyCredentialJSON.response.publicKey,
        userId: userKV.key,
      },
    });
    userKV.value.passkeys.add(publicKeyCredentialJSON.id);
    await storeUserKV(userKV);
    ctx.state.sessionKV.value.userKV = userKV;
    delete ctx.state.sessionKV.value.authenticating;

    return new Response();
  },
});
