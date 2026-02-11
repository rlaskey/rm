import { type Middleware } from "../../../../src/framework.ts";
import { type User } from "../../../../src/user.ts";

import { cborResponse } from "../../../../src/cbor-encode.ts";
import {
  decodeAuthenticatorData,
  decodeClientDataJSON,
  insertPasskey,
  publicKeyCredentialCreationOptions,
} from "../../../../src/passkeys.ts";
import { db } from "../../../../src/sqlite.ts";

export const create1: Middleware = async (ctx, _) => {
  if (!ctx.state.session) {
    ctx.res = new Response("Session is not set.", { status: 400 });
    return;
  }

  if (!ctx.state.session.data.get("challenge")) {
    ctx.res = new Response("Challenge is not set.", { status: 400 });
    return;
  }

  const user = new Map() as User;
  if (ctx.state.session.data.get("futureUser")) {
    (ctx.state.session.data.get("futureUser") as User).forEach((v, k) =>
      user.set(k, v)
    );
  } else {
    if (!ctx.state.session.user_id) {
      ctx.res = new Response("User not found.", { status: 400 });
      return;
    }
    using stmt = db.prepare("SELECT * FROM user WHERE id = ?");
    const existingUser = stmt.get(ctx.state.session.user_id);
    if (!existingUser) {
      ctx.state.session.user_id = null;
      ctx.res = new Response("User not found.", { status: 400 });
      return;
    }

    Object.entries(existingUser).forEach((e) => user.set(e[0], e[1]));
  }

  const publicKeyCredentialJSON: PublicKeyCredentialJSON = await ctx.req
    .json();
  const response = publicKeyCredentialJSON.response;
  const clientData = decodeClientDataJSON(response.clientDataJSON);

  // https://w3c.github.io/webauthn/#sctn-registering-a-new-credential
  if (clientData.type !== "webauthn.create") {
    ctx.res = new Response("clientData.type", { status: 400 });
    return;
  }
  if (clientData.challenge !== ctx.state.session.data.get("challenge")) {
    ctx.res = new Response("clientData.challenge", { status: 400 });
    return;
  }

  // Re-create the options so we can compare.
  // This is deterministic: the same challenge + user gets the same results.
  const options = publicKeyCredentialCreationOptions(
    ctx.state.session.data.get("challenge") as string,
    user,
  );

  if ((new URL(clientData.origin)).hostname !== options.rp.id) {
    ctx.res = new Response("clientData.origin", { status: 400 });
    return;
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
  ) {
    ctx.res = new Response("authenticatorData.rpId", { status: 400 });
    return;
  }
  if (!authenticatorData.flags.userPresent) {
    ctx.res = new Response(
      "authenticatorData.flags.userPresent is not set. " +
        "We are not supporting `conditional` mediation.",
      { status: 400 },
    );
    return;
  }

  if (
    options.authenticatorSelection?.userVerification === "required" &&
    !authenticatorData.flags.userVerified
  ) {
    ctx.res = new Response("authenticatorData.flags.userVerified", {
      status: 400,
    });
    return;
  }
  if (
    !authenticatorData.flags.backupEligibility &&
    authenticatorData.flags.backupState
  ) {
    ctx.res = new Response("backup is not eligible, but we have a backup.", {
      status: 400,
    });
    return;
  }

  if (
    !options.pubKeyCredParams.some((e) => e.alg === response.publicKeyAlgorithm)
  ) {
    ctx.res = new Response("response.publicKeyAlgorithm", { status: 400 });
    return;
  }

  // Convert a FutureUser to a User.
  if (typeof user.get("id") === "string") {
    using stmt = db.prepare("INSERT INTO user (name) VALUES (?)");
    const changes = stmt.run(user.get("name") as string);
    if (changes !== 1) {
      ctx.res = new Response("Failed to save User.", { status: 400 });
      return;
    }
    user.set("id", db.lastInsertRowId);
  }

  if (
    insertPasskey({
      id: publicKeyCredentialJSON.id,
      alg: publicKeyCredentialJSON.response.publicKeyAlgorithm,
      public_key: publicKeyCredentialJSON.response.publicKey,
      user_id: user.get("id") as number | bigint,
    }) !== 1
  ) {
    ctx.res = new Response("Failed to save Passkey.", { status: 400 });
    return;
  }

  ctx.state.session.user_id = user.get("id") as number | bigint;

  ctx.state.session.data.delete("challenge");
  ctx.state.session.data.delete("futureUser");

  ctx.res = cborResponse(publicKeyCredentialJSON.id);
};
