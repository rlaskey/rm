import { type Middleware } from "../../src/framework.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { client } from "../../src/sqlite.ts";

export const articleReferenceDelete: Middleware = async (ctx, _) => {
  ctx.res = cborResponse(
    (
      await client.execute({
        sql: "DELETE FROM article_reference WHERE article_id = ? AND reference_id = ?",
        args: [
          ctx.url.searchParams.get("articleId"),
          ctx.url.searchParams.get("referenceId"),
        ],
      })
    ).rowsAffected,
  );
};

export const articleReference: Middleware = async (ctx, _) => {
  const r = cborDecode(await ctx.req.bytes()) as Map<string, bigint>;
  ctx.res = cborResponse(
    (
      await client.execute({
        sql:
          "INSERT OR IGNORE INTO article_reference (article_id, reference_id) " +
          "VALUES (?, ?)",
        args: [r.get("article_id")!, r.get("reference_id")!],
      })
    ).lastInsertRowid,
  );
};

export const referencePairDelete: Middleware = async (ctx, _) => {
  const sorted = [...new Set(ctx.url.searchParams.getAll("id"))]
    .map((id) => Number(id))
    .sort();
  if (sorted.length !== 2) return;

  ctx.res = cborResponse(
    (
      await client.execute({
        sql: "DELETE FROM reference_pair WHERE a = ? AND b = ?",
        args: sorted,
      })
    ).rowsAffected,
  );
};

export const referencePair: Middleware = async (ctx, _) => {
  const r = cborDecode(await ctx.req.bytes());
  if (!Array.isArray(r)) return;
  const sorted = [...new Set(r)].sort();
  if (sorted.length !== 2) return;

  ctx.res = cborResponse(
    (
      await client.execute({
        sql: "INSERT OR IGNORE INTO reference_pair (a, b) VALUES (?, ?)",
        args: sorted,
      })
    ).lastInsertRowid,
  );
};

export const articlePairDelete: Middleware = async (ctx, _) => {
  const sorted = [...new Set(ctx.url.searchParams.getAll("id"))]
    .map((id) => Number(id))
    .sort();
  if (sorted.length !== 2) return;

  ctx.res = cborResponse(
    (
      await client.execute({
        sql: "DELETE FROM article_pair WHERE a = ? AND b = ?",
        args: sorted,
      })
    ).rowsAffected,
  );
};

export const articlePair: Middleware = async (ctx, _) => {
  const r = cborDecode(await ctx.req.bytes());
  if (!Array.isArray(r)) return;
  const sorted = [...new Set(r)].sort();
  if (sorted.length !== 2) return;

  ctx.res = cborResponse(
    (
      await client.execute({
        sql: "INSERT OR IGNORE INTO article_pair (a, b) VALUES (?, ?)",
        args: sorted,
      })
    ).lastInsertRowid,
  );
};
