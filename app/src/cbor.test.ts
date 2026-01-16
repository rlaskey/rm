import { assertEquals } from "@std/assert";

import { toObject } from "./cbor.ts";

Deno.test("toObject", () => {
  assertEquals(
    toObject(
      new Map<number, string | object>([
        [1, "hey"],
        [2, { nah: true }],
      ]),
    ),
    { 1: "hey", 2: { nah: true } },
  );

  assertEquals(
    toObject(
      {
        a: new Map<number, string | object>([
          [1, "hey"],
        ]),
      },
    ),
    { a: { 1: "hey" } },
  );

  assertEquals(
    toObject([
      "a",
      1,
      { a: true },
      new Map<string, string>([["x", "y"]]),
    ]),
    ["a", 1, { a: true }, { x: "y" }],
  );
});
