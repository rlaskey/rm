import { type Middleware } from "../../src/framework.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { db } from "../../src/sqlite.ts";

import { aLabeledURL } from "../../browser/src/data.ts";

const save = (
  record: Record<string, typeof aLabeledURL.valueType>,
  originalId: string,
): string | undefined => {
  if (record.id && record.id === originalId) {
    using stmt0 = db.prepare("UPDATE url SET label = ? WHERE id = ?");
    if (stmt0.run(record["label"] || null, originalId) !== 1) {
      return "UPDATE failed.";
    }

    return;
  }

  if (record.id && record.id !== originalId) {
    try {
      using stmt1 = db.prepare(
        "INSERT INTO url (" + Object.keys(record).join(", ") +
          ") VALUES (" +
          Object.keys(record).map((_) => "?").join(", ") + ")",
      );
      if (stmt1.run(Object.values(record)) !== 1) return "INSERT failed.";
    } catch (e) {
      if (e instanceof SuppressedError) {
        let s = e.suppressed;
        while (s && s.suppressed) s = s.suppressed;
        return s;
      }
      if (e instanceof Error) return String(e.message);
      return "Unknown error w/ INSERT.";
    }
  }

  if (originalId && record.id !== originalId) {
    using stmt2 = db.prepare("DELETE FROM url WHERE id = ?");
    if (stmt2.run(originalId) !== 1) {
      return "DELETE failed.";
    }
  }
};

export const postURL: Middleware = async (ctx, _) => {
  const r = cborDecode(await ctx.req.bytes());
  if (!(r instanceof Map)) {
    ctx.res = new Response("Bad input.", { status: 400 });
    return;
  }

  const record = aLabeledURL.forInsert(r) as Record<
    string,
    typeof aLabeledURL.valueType
  >;
  if (!Object.keys(record).length) {
    ctx.res = new Response("Empty record.", { status: 400 });
    return;
  }
  const error = save(record, r.get("originalId") as string);
  if (error) {
    ctx.res = new Response(error, { status: 400 });
    return;
  }

  using stmt1 = db.prepare("SELECT id, label FROM url WHERE reference_id = ?");
  ctx.res = cborResponse(stmt1.all(record.reference_id));
};
