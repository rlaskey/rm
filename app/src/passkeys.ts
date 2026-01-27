import { joinUint8Arrays } from "./cbor.ts";
import { cborEncode } from "./cbor-encode.ts";
import { HOSTNAME, SITE_NAME } from "./env.ts";
import { db } from "./sqlite.ts";
import { User } from "./user.ts";

interface AuthenticatorData {
  rpId: Base64URLString;
  flags: {
    userPresent: boolean;
    userVerified: boolean;
    backupEligibility: boolean;
    backupState: boolean;
    attestedCredentialData: boolean;
    extensionDataIncluded: boolean;
  };
  signCount: number;
  aaguid?: Base64URLString;

  // Generally, do NOT use either of these, unless you can help it.
  credentialId?: Base64URLString;
  credentialPublicKey?: Base64URLString;
}

// https://w3c.github.io/webauthn/#dictionary-client-data
interface CollectedClientData {
  challenge: Base64URLString;
  type: "webauthn.get" | "webauthn.create";
  origin: string;
  crossOrigin?: boolean;
  topOrigin?: string;
  tokenBinding?: {
    status: "supported" | "present";
    id: Base64URLString;
  };
}

export interface Passkey {
  id: Base64URLString;
  alg: COSEAlgorithmIdentifier;
  public_key: Base64URLString;
  user_id: number | bigint;
}

export const insertPasskey = (passkey: Passkey) => {
  using stmt = db.prepare("INSERT INTO passkey VALUES (?, ?, ?, ?)");
  return stmt.run(
    passkey.id,
    passkey.alg,
    passkey.public_key,
    passkey.user_id,
  );
};

export const deletePasskey = (id: Base64URLString) => {
  using stmt = db.prepare("DELETE FROM passkey WHERE id = ?");
  return stmt.run(id);
};

abstract class Algorithm {
  // abstract readonly alg: COSEAlgorithmIdentifier;
  abstract readonly name: string;
  abstract verify(
    spkiPublicKey: Base64URLString,
    signature: Base64URLString,
    authenticatorData: Base64URLString,
    clientDataJSON: Base64URLString,
  ): Promise<boolean>;
}

export class ES256 extends Algorithm {
  // readonly alg = -7;
  readonly name = "ECDSA";
  private readonly hash: string = "SHA-256";

  public verify = async (
    spkiPublicKey: Base64URLString,
    signature: Base64URLString,
    authenticatorData: Base64URLString,
    clientDataJSON: Base64URLString,
  ): Promise<boolean> => {
    const algoParams = {
      name: this.name,
      namedCurve: "P-256",
      hash: this.hash,
    };
    const importedKey = await crypto.subtle.importKey(
      "spki",
      Uint8Array.fromBase64(spkiPublicKey, { alphabet: "base64url" }),
      algoParams,
      false,
      ["verify"],
    );

    const binaryAuthenticatorData = Uint8Array.fromBase64(authenticatorData, {
      alphabet: "base64url",
    });

    const clientDataJSONHash = new Uint8Array(
      await crypto.subtle.digest(
        this.hash,
        Uint8Array.fromBase64(clientDataJSON, { alphabet: "base64url" }),
      ),
    );
    const signedData = joinUint8Arrays([
      binaryAuthenticatorData,
      clientDataJSONHash,
    ]);

    return await crypto.subtle.verify(
      algoParams,
      importedKey,
      this.extractASN1(
        Uint8Array.fromBase64(signature, { alphabet: "base64url" }),
      ).buffer as BufferSource,
      signedData.buffer as BufferSource,
    );
  };

  private asn1Length = (asn1Part: Uint8Array): [number, number] => {
    if (asn1Part[0] < 127) return [asn1Part[0], 1];

    // What follows might not be quite right. I'm not sure we'll even see this.
    const nextBytes: number = asn1Part[0] & 0b1111111;
    if (nextBytes > 6) throw Error("ASN.1: we are expecting too many bytes.");
    let length: number = 0;
    for (let i: number = 0; i < nextBytes; i++) {
      length = (length << 8) | asn1Part[1 + i];
    }
    return [length, 1 + nextBytes];
  };

  public extractASN1 = (asn1: Uint8Array): Uint8Array => {
    let i: number = 0;
    if (asn1[i++] !== 0x30) {
      throw new Error("ASN.1: we do not have a sequence.");
    }
    i += this.asn1Length(asn1.subarray(i))[1];

    if (asn1.at(i++) !== 0x02) throw new Error("ASN.1: missing `r` integer.");
    const [rLength, rLengthSkip] = this.asn1Length(asn1.subarray(i));
    i += rLengthSkip;
    let r = asn1.subarray(i, i + rLength);
    i += rLength;

    // Overage: handle the cases where we have an extra `0x00`
    // due to the ASN.1 encoding.
    const rOverage = r.byteLength - 32;
    if (rOverage > 0) r = r.subarray(rOverage);

    if (asn1.at(i++) !== 0x02) throw new Error("ASN.1: missing `s` integer.");
    const [sLength, sLengthSkip] = this.asn1Length(asn1.subarray(i));
    i += sLengthSkip;
    let s = asn1.subarray(i, i + sLength);

    const sOverage = s.byteLength - 32;
    if (sOverage > 0) s = s.subarray(sOverage);

    const result = new Uint8Array(64);

    // Zero-padding: we put the results up at the right edge
    // of each 32-byte boundary. We need each of these values to be 32 bytes
    // because of the P-256 mechanism
    result.set(r, 32 - r.byteLength);
    result.set(s, 64 - s.byteLength);
    return result;
  };
}

export const ALGORITHMS = new Map<number, Algorithm>([[-7, new ES256()]]);

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
      id: cborEncode(user.get("id")).toBase64({ alphabet: "base64url" }),
      name: user.get("name") as string,
      displayName: user.get("name") as string,
    },
    challenge,
  };
};

export const createChallenge = (): Base64URLString =>
  crypto.getRandomValues(new Uint8Array(18)).toBase64({
    alphabet: "base64url",
  });

export const decodeAuthenticatorData = (
  authenticatorData: Base64URLString,
): AuthenticatorData => {
  const u = Uint8Array.fromBase64(authenticatorData, { alphabet: "base64url" });
  const flags = u.at(32) as number;

  // https://w3c.github.io/webauthn/#authenticator-data
  const result: AuthenticatorData = {
    rpId: u.subarray(0, 32).toBase64({ alphabet: "base64url" }),
    flags: {
      userPresent: !!(flags & (1 << 0)),
      userVerified: !!(flags & (1 << 2)),
      backupEligibility: !!(flags & (1 << 3)),
      backupState: !!(flags & (1 << 4)),
      attestedCredentialData: !!(flags & (1 << 6)),
      extensionDataIncluded: !!(flags & (1 << 7)),
    },
    signCount: new DataView(u.buffer, 33, 4).getUint32(0),
  };

  if (result.flags.attestedCredentialData) {
    // This is often used for an allow-list.
    // https://fidoalliance.org/metadata/ has more information.
    // We're passing this along because we can,
    // but it's unclear that it's all that helpful.
    // It MAY be worthwhile to aggregate these, alongside the UserAgent.
    result.aaguid = u.subarray(37, 53).toBase64({ alphabet: "base64url" });

    const credentialIdLength: number = new DataView(u.buffer, 53, 2)
      .getUint16(0);
    // NOTE: the parent object, PublicKeyCredentialJSON,
    // already represents this information, in its `id` and `rawId`.
    result.credentialId = u.subarray(55, 55 + credentialIdLength)
      .toBase64({ alphabet: "base64url" });

    // Generally, this is COSE: CBOR Object Signing + Encryption.
    result.credentialPublicKey = u.subarray(55 + credentialIdLength).toBase64({
      alphabet: "base64url",
    });
  }

  return result;
};

export const decodeClientDataJSON = (
  clientDataJSON: Base64URLString,
): CollectedClientData =>
  JSON.parse((new TextDecoder()).decode(
    Uint8Array.fromBase64(clientDataJSON, { alphabet: "base64url" }),
  )) as CollectedClientData;
