import { type Middleware } from "../../src/framework.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { db } from "../../src/sqlite.ts";

export const articleReferenceDelete: Middleware = (ctx, _) => {
  ctx.res = cborResponse(
    db.prepare(
      "DELETE FROM article_reference WHERE article_id = ? AND reference_id = ?",
    ).run(
      ctx.url.searchParams.get("articleId"),
      ctx.url.searchParams.get("referenceId"),
    ),
  );
};

export const articleReference: Middleware = async (ctx, _) => {
  const r = cborDecode(await ctx.req.bytes()) as Map<string, number>;
  ctx.res = cborResponse(
    db.prepare(
      "INSERT OR IGNORE INTO article_reference (article_id, reference_id) " +
        "VALUES (?, ?)",
    ).run(r.get("article_id")!, r.get("reference_id")!).lastInsertRowid,
  );
};

export const referencePairDelete: Middleware = (ctx, _) => {
  const sorted = [...new Set(ctx.url.searchParams.getAll("id"))]
    .map((id) => Number(id)).sort();
  if (sorted.length !== 2) return;

  ctx.res = cborResponse(
    db.prepare("DELETE FROM reference_pair WHERE a = ? AND b = ?")
      .run(...sorted).changes,
  );
};

export const referencePair: Middleware = async (ctx, _) => {
  const r = cborDecode(await ctx.req.bytes()) as [number, number];
  if (!Array.isArray(r)) return;
  const sorted = [...new Set(r)].sort();
  if (sorted.length !== 2) return;

  ctx.res = cborResponse(
    db.prepare(
      "INSERT OR IGNORE INTO reference_pair (a, b) VALUES (?, ?)",
    ).run(...sorted).lastInsertRowid,
  );
};

export const articlePairDelete: Middleware = (ctx, _) => {
  const sorted = [...new Set(ctx.url.searchParams.getAll("id"))]
    .map((id) => Number(id)).sort();
  if (sorted.length !== 2) return;

  ctx.res = cborResponse(
    db.prepare("DELETE FROM article_pair WHERE a = ? AND b = ?").run(...sorted),
  );
};

export const articlePair: Middleware = async (ctx, _) => {
  const r = cborDecode(await ctx.req.bytes()) as [number, number];
  if (!Array.isArray(r)) return;
  const sorted = [...new Set(r)].sort();
  if (sorted.length !== 2) return;

  ctx.res = cborResponse(
    db.prepare(
      "INSERT OR IGNORE INTO article_pair (a, b) VALUES (?, ?)",
    ).run(...sorted).lastInsertRowid,
  );
};
