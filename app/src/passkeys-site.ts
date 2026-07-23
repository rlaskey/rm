import { cborEncode } from "./cbor-encode.ts";
import { HOSTNAME, SITE_NAME } from "./env.ts";
import { ALGORITHMS, type Passkey } from "./passkeys.ts";
import { db } from "./sqlite.ts";
import { User } from "./user.ts";

export const insertPasskey = (passkey: Passkey) =>
  db.prepare("INSERT INTO passkey VALUES (?, ?, ?, ?)")
    .run(passkey.id, passkey.alg, passkey.public_key, passkey.user_id).changes;

export const deletePasskey = (id: Base64URLString) =>
  db.prepare("DELETE FROM passkey WHERE id = ?").run(id);

export const publicKeyCredentialRequestOptionsJSON = (
  challenge: string,
): PublicKeyCredentialRequestOptionsJSON => {
  return {
    rpId: HOSTNAME,
    userVerification: "required",
    challenge,
  };
};

export const publicKeyCredentialCreationOptions = (
  challenge: string,
  user: User,
): PublicKeyCredentialCreationOptionsJSON => {
  return {
    rp: {
      id: HOSTNAME,
      name: SITE_NAME,
    },
    pubKeyCredParams: [...ALGORITHMS.keys()].map((e) => {
      return { alg: e, type: "public-key" };
    }),
    user: {
      id: cborEncode(user.get("id")).toBase64({
        alphabet: "base64url",
        omitPadding: true,
      }),
      name: user.get("name") as string,
      displayName: user.get("name") as string,
    },
    challenge,
  };
};
