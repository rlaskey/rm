import { z } from "zod";

import type { SupportedMapsCBOR } from "../../src/cbor.ts";

export const dbArticle = z.object({
  id: z.coerce.bigint(),
  words: z.string(),
  published: z.coerce.bigint().nullable().meta({ epochSeconds: true }),
  title: z.string().nullable(),
});

export const dbFile = z.object({
  id: z.coerce.bigint(),
  md5: z.instanceof(Uint8Array),
  content_type: z.string().nullable(),
  title: z.string().nullable(),
});

export const dbReference = z.object({
  id: z.coerce.bigint(),
  name: z.string().trim().min(1),
});

export const dbURL = z.object({
  id: z.url(),
  reference_id: z.coerce.bigint(),
  label: z.string().trim().nullable(),
});

export const mapToZodObject = <T extends z.ZodObject>(
  input: SupportedMapsCBOR,
  schema: T,
) => {
  const record: Record<string, unknown> = {};
  Object.keys(schema.shape).forEach((c) => record[c] = input.get(c));
  return schema.safeParse(record);
};

export const formElementsToZodObject = <T extends z.ZodObject>(
  elements: HTMLFormControlsCollection,
  schema: T,
) => {
  const record: Record<string, unknown> = {};

  Object.keys(schema.shape).forEach((c) => {
    const element = elements.namedItem(c) as HTMLFormElement | null;
    if (!element) return;

    if (schema.shape[c].isOptional() && !element.value) {
      record[c] = undefined;
    } else if (schema.shape[c].isNullable() && !element.value) {
      record[c] = null;
    } else if (schema.shape[c].meta()?.["epochSeconds"] === true) {
      record[c] = BigInt((new Date(element.value)).getTime() / 1000);
    } else {
      record[c] = element.value;
    }
  });

  return schema.safeParse(record);
};
