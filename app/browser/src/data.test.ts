import { assertEquals } from "@std/assert";

import type { SupportedCBOR } from "../../src/cbor.ts";

import { dbURL, mapToZodObject } from "./data.ts";

Deno.test("forInsert", () => {
  assertEquals(
    mapToZodObject(
      new Map<string, SupportedCBOR>([["id", "https://en.wikipedia.org"], [
        "reference_id",
        12,
      ], ["label", null]]),
      dbURL,
    ),
    {
      success: true,
      data: {
        id: "https://en.wikipedia.org",
        reference_id: 12n,
        label: null,
      },
    },
  );
});
