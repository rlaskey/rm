import { z } from "zod";

import { dbURL, mapToZodObject } from "../../browser/src/data.ts";

import type { Middleware } from "../../src/framework.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { r400 } from "../../src/response.ts";
import { client } from "../../src/sqlite.ts";

const pURL = dbURL.partial({ id: true });

const save = async (
  record: z.infer<typeof pURL>,
  originalId: string | undefined,
): Promise<string | undefined> => {
  if (record.id && record.id === originalId) {
    if (
      (
        await client.execute({
          sql: "UPDATE url SET label = ? WHERE id = ?",
          args: [record.label || null, originalId],
        })
      ).rowsAffected != 1
    )
      return "UPDATE failed.";

    return;
  }

  if (record.id && record.id !== originalId) {
    try {
      if (
        (
          await client.execute({
            sql:
              "INSERT INTO url (" +
              Object.keys(record).join(", ") +
              ") VALUES (" +
              Object.keys(record)
                .map((_) => "?")
                .join(", ") +
              ")",
            args: Object.values(record),
          })
        ).rowsAffected != 1
      )
        return "INSERT failed.";
    } catch (error) {
      let e = error;
      while (e instanceof SuppressedError) e = e.suppressed;

      if (e instanceof Error) return String(e.message);
      return "Unknown error w/ INSERT.";
    }
  }

  if (originalId && record.id !== originalId) {
    if (
      (
        await client.execute({
          sql: "DELETE FROM url WHERE id = ?",
          args: [originalId],
        })
      ).rowsAffected != 1
    )
      return "DELETE failed.";
  }
};

export const postURL: Middleware = async (ctx, _) => {
  const r = cborDecode(await ctx.req.bytes());
  if (!(r instanceof Map)) {
    ctx.res = r400;
    return;
  }

  const spr = mapToZodObject(r, pURL);
  if (!spr.success) {
    ctx.res = r400;
    return;
  }

  const error = await save(spr.data, r.get("originalId") as string | undefined);
  if (error) {
    ctx.res = new Response(error, { status: 400 });
    return;
  }

  ctx.res = cborResponse(
    (
      await client.execute({
        sql: "SELECT * FROM url WHERE reference_id = ?",
        args: [spr.data.reference_id],
      })
    ).rows,
  );
};
