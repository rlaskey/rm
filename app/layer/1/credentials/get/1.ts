import { Middleware } from "../../../../src/framework.ts";
import {
  ALGORITHMS,
  decodeAuthenticatorData,
  decodeClientDataJSON,
  deletePasskey,
  Passkey,
  publicKeyCredentialRequestOptionsJSON,
} from "../../../../src/passkeys.ts";
import { db } from "../../../../src/sqlite.ts";
import { User } from "../../../../src/user.ts";

export const get1: Middleware = async (ctx, _) => {
  if (!ctx.state.session) {
    ctx.res = new Response("Session is not set.", { status: 400 });
    return;
  }

  if (!ctx.state.session.data.get("challenge")) {
    ctx.res = new Response("Challenge is not set.", { status: 400 });
    return;
  }

  const publicKeyCredentialJSON: PublicKeyCredentialJSON = await ctx.req.json();
  const passkey = db.prepare("SELECT * FROM passkey WHERE id = ?").get(
    publicKeyCredentialJSON.id,
  ) as Passkey | undefined;
  if (!passkey) {
    ctx.res = new Response("Passkey not found.", { status: 400 });
    return;
  }

  // https://w3c.github.io/webauthn/#sctn-verifying-assertion

  const algorithm = ALGORITHMS.get(passkey.alg);
  if (typeof algorithm === "undefined") {
    ctx.res = new Response("Bad algorithm in a stored Passkey.", {
      status: 400,
    });
    return;
  }

  if (
    !await algorithm.verify(
      passkey.public_key,
      publicKeyCredentialJSON.response.signature,
      publicKeyCredentialJSON.response.authenticatorData,
      publicKeyCredentialJSON.response.clientDataJSON,
    )
  ) {
    ctx.res = new Response("Verification failed.", { status: 400 });
    return;
  }

  const user = db.prepare("SELECT * FROM user WHERE id = ?").get(
    passkey.user_id,
  ) as object | undefined;
  if (!user) {
    deletePasskey(publicKeyCredentialJSON.id);
    ctx.res = new Response(
      "Passkey was associated with a deleted User account.",
      { status: 400 },
    );
    return;
  }
  ctx.state.user = new Map(Object.entries(user)) as User;

  const C = decodeClientDataJSON(
    publicKeyCredentialJSON.response.clientDataJSON,
  );
  if (C.type !== "webauthn.get") {
    ctx.res = new Response("C.type", { status: 400 });
    return;
  }
  if (C.challenge !== ctx.state.session.data.get("challenge")) {
    ctx.res = new Response("C.challenge", { status: 400 });
    return;
  }

  const options = publicKeyCredentialRequestOptionsJSON(
    ctx.state.session.data.get("challenge") as string,
  );

  if ((new URL(C.origin)).hostname !== options.rpId) {
    ctx.res = new Response("clientData.origin", { status: 400 });
    return;
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
    ctx.res = new Response("authenticatorData.rpId", { status: 400 });
    return;
  }

  if (!authenticatorData.flags.userPresent) {
    ctx.res = new Response("authenticatorData.flags.userPresent is not set.", {
      status: 400,
    });
    return;
  }

  if (
    options.userVerification === "required" &&
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

  ctx.state.session.user_id = ctx.state.user.get("id") as number | bigint;

  ctx.state.session.data.delete("challenge");
  ctx.state.session.data.delete("futureUser");

  ctx.res = new Response(null);
};
