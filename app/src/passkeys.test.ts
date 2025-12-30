import { assertEquals } from "@std/assert";
import {
  decodeAuthenticatorData,
  decodeClientDataJSON,
  ES256,
} from "./passkeys.ts";

Deno.test("decodeAuthenticatorData(realTestData)", () => {
  const authenticatorData: Base64URLString = "SZYN5YgOjGh0NBcPZHZgW4_krrmihj" +
    "LHmVzzuoMdl2NFAAAAAJ3dGBevWkZyork-PdlQAKkAIKEIs_Zan0naHbubsKxUVasTfEBqk" +
    "ipNwTiOEVuhlrzBpQECAyYgASFYIELcIOWWqzxEmIPqozLjy5LFHBB0GBGizXw2B136NIMc" +
    "IlggJlEQ4VwQ5kmqUFxcPsiEbTkqUJRk-LHnQNRw2d-RLkQ";

  assertEquals(decodeAuthenticatorData(authenticatorData), {
    rpId: "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2M=",
    flags: {
      userPresent: true,
      userVerified: true,
      backupEligibility: false,
      backupState: false,
      attestedCredentialData: true,
      extensionDataIncluded: false,
    },
    signCount: 0,
    aaguid: "nd0YF69aRnKiuT492VAAqQ==",
    credentialId: "oQiz9lqfSdodu5uwrFRVqxN8QGqSKk3BOI4RW6GWvME=",
    credentialPublicKey: "pQECAyYgASFYIELcIOWWqzxEmIPqozLjy5LFHBB0GBGizXw2B1" +
      "36NIMcIlggJlEQ4VwQ5kmqUFxcPsiEbTkqUJRk-LHnQNRw2d-RLkQ=",
  });
});

Deno.test("decodeClientDataJSON", () => {
  const clientDataJSON: Base64URLString = "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlI" +
    "iwiY2hhbGxlbmdlIjoieHpQSzBncGRPU2MxcmZKc2dtbEtld051Iiwib3JpZ2luIjoiaHR0" +
    "cDovL2xvY2FsaG9zdDo1MTczIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ";
  assertEquals(
    decodeClientDataJSON(clientDataJSON),
    {
      challenge: "xzPK0gpdOSc1rfJsgmlKewNu",
      type: "webauthn.create",
      origin: "http://localhost:5173",
      crossOrigin: false,
    },
  );
});

Deno.test("ES256 ASN.1", () => {
  const es256 = new ES256();

  assertEquals(
    es256.extractASN1(Uint8Array.fromBase64(
      "MEQCICbDADNScO53kNlbyHGdPWY3QA78LdfO68" +
        "SGAJdHVYvtAiBR9uR6WaRwT5uRC-EDcvOJ8cfhtKpVMYxRY9OijPzsBw",
      { alphabet: "base64url" },
    )),
    Uint8Array.fromHex(
      "26C300335270EE7790D95BC8719D3D6637400EFC2DD7CEEBC486009747558BED" +
        "51F6E47A59A4704F9B910BE10372F389F1C7E1B4AA55318C5163D3A28CFCEC07",
    ),
  );

  // From https://w3c.github.io/webauthn/#sctn-signature-attestation-types
  assertEquals(
    es256.extractASN1(Uint8Array.fromHex(
      "304302210089909504e14f1e29dba8158fa7c387e888ffbe07d824bb2143205506ab1" +
        "59c3e021e56554fb5819b12845e85be2f78371cf3cb95e387f451cb362b9478d183d2",
    )),
    Uint8Array.fromHex(
      "89909504e14f1e29dba8158fa7c387e888ffbe07d824bb2143205506ab159c3e" +
        "000056554fb5819b12845e85be2f78371cf3cb95e387f451cb362b9478d183d2",
    ),
  );

  assertEquals(
    es256.extractASN1(Uint8Array.fromBase64(
      "MEYCIQDglT44dcm0uZn6Wth1LUPjCnS" +
        "ZVyFDScg07NwAEzkQ6gIhAOQx9UIxWt7AFX5C6aHK6cLiyR81C6nNh3eJc6QjeOCT",
    )),
    Uint8Array.fromHex(
      "E0953E3875C9B4B999FA5AD8752D43E30A749957214349C834ECDC00133910EA" +
        "E431F542315ADEC0157E42E9A1CAE9C2E2C91F350BA9CD87778973A42378E093",
    ),
  );
});
