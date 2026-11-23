import { expect, test } from "bun:test";

import type { SupportedCBOR } from "../../src/cbor.ts";

import { dbURL, mapToZodObject } from "./data.ts";

test("forInsert", () => {
  expect(
    mapToZodObject(
      new Map<string, SupportedCBOR>([
        ["id", "https://en.wikipedia.org"],
        ["reference_id", 12],
        ["label", null],
      ]),
      dbURL,
    ),
  ).toEqual({
    success: true,
    data: {
      id: "https://en.wikipedia.org",
      reference_id: 12n,
      label: null,
    },
  });
});
