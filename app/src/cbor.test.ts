import { assertEquals } from "@std/assert";

import { decode } from "./cbor.ts";

Deno.test("decode(cosePublicKey)", () => {
  const publicKey: Base64URLString = "pQECAyYgASFYIELcIOWWqzxEmIPqozLjy5LFHB" +
    "B0GBGizXw2B136NIMcIlggJlEQ4VwQ5kmqUFxcPsiEbTkqUJRk-LHnQNRw2d-RLkQ=";

  assertEquals(
    decode(Uint8Array.fromBase64(publicKey, { alphabet: "base64url" })),
    new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [
        -2,
        Uint8Array.fromHex(
          "42dc20e596ab3c449883eaa332e3cb92c51c10741811a2cd7c36075dfa34831c",
        ),
      ],
      [
        -3,
        Uint8Array.fromHex(
          "265110e15c10e649aa505c5c3ec8846d392a509464f8b1e740d470d9df912e44",
        ),
      ],
    ]),
  );
});

Deno.test("decode(nestedMap)", () => {
  assertEquals(
    decode(Uint8Array.fromHex("A26161F56162A0")),
    new Map<string, boolean | Map<number, number>>([["a", true], [
      "b",
      new Map<number, number>(),
    ]]),
  );
});

Deno.test("decode(nestedArray)", () => {
  assertEquals(
    decode(Uint8Array.fromHex("840102F783030481F6")),
    [1, 2, undefined, [3, 4, [null]]],
  );
});
