import { SELECT_LIMIT } from "../../browser/src/site.ts";

import { type Middleware } from "../../src/framework.ts";

import { cborResponse } from "../../src/cbor-encode.ts";
import { client } from "../../src/sqlite.ts";

type Result = Record<string, unknown>;

const files = async (
  result: Result,
  searchParams: URLSearchParams,
): Promise<void> => {
  const filesSkip = BigInt(searchParams.get("f") || 0);

  if (filesSkip > 0n) {
    result.files = (
      await client.execute(
        "SELECT * FROM file WHERE id <= ? " +
          "ORDER BY id DESC LIMIT " +
          (SELECT_LIMIT + 1),
        [filesSkip],
      )
    ).rows;

    result.backFile = (
      await client.execute(
        "SELECT r.* FROM (" +
          "SELECT id FROM file WHERE id > ? " +
          "ORDER BY id ASC LIMIT " +
          SELECT_LIMIT +
          ") AS r ORDER BY id DESC LIMIT 1",
        [filesSkip],
      )
    ).rows[0]?.id;
  } else {
    result.files = (
      await client.execute(
        "SELECT * FROM file " + "ORDER BY id DESC LIMIT " + (SELECT_LIMIT + 1),
      )
    ).rows;
  }
};

const drafts = async (
  result: Result,
  searchParams: URLSearchParams,
): Promise<void> => {
  const draftsSkip = BigInt(searchParams.get("d") || 0);
  result.drafts = (
    await client.execute(
      "SELECT id, title, SUBSTR(words, 0, 43) AS words " +
        "FROM article " +
        "WHERE published IS NULL AND id >= ? " +
        "ORDER BY id ASC LIMIT " +
        (SELECT_LIMIT + 1),
      [draftsSkip],
    )
  ).rows;

  if (draftsSkip > 0n) {
    result.backDraft = (
      await client.execute(
        "SELECT r.* FROM (" +
          "SELECT id FROM article " +
          "WHERE published IS NULL AND id < ? " +
          "ORDER BY id DESC LIMIT " +
          SELECT_LIMIT +
          ") AS r ORDER BY r.id ASC LIMIT 1",
        [draftsSkip],
      )
    ).rows[0]?.id;
  }
};

const published = async (
  result: Result,
  searchParams: URLSearchParams,
): Promise<void> => {
  const skipPublished = searchParams.get("pPublished");
  const skipPublishedID = searchParams.get("pID");
  if (skipPublished !== null && skipPublishedID !== null) {
    result.published = (
      await client.execute(
        "SELECT id, published, title, SUBSTR(words, 0, 43) AS words " +
          "FROM article " +
          "WHERE published IS NOT NULL AND " +
          "(published < ? OR (published = ? AND id >= ?)) " +
          "ORDER BY published DESC, id ASC LIMIT " +
          (SELECT_LIMIT + 1),
        [skipPublished, skipPublished, skipPublishedID],
      )
    ).rows;

    const row = (
      await client.execute(
        "SELECT r.* FROM (" +
          "SELECT published, id FROM article " +
          "WHERE published IS NOT NULL AND " +
          "(published > ? OR (published = ? AND id < ?)) " +
          "ORDER BY published ASC, id DESC LIMIT " +
          SELECT_LIMIT +
          ") AS r ORDER BY r.published DESC, id ASC LIMIT 1",
        [skipPublished, skipPublished, skipPublishedID],
      )
    ).rows[0];
    result.backPublished = row ? [row.published, row.id] : undefined;
  } else {
    result.published = (
      await client.execute(
        "SELECT id, published, title, SUBSTR(words, 0, 43) AS words " +
          "FROM article " +
          "WHERE published IS NOT NULL " +
          "ORDER BY published DESC, id ASC LIMIT " +
          (SELECT_LIMIT + 1),
      )
    ).rows;
  }
};

const references = async (
  result: Result,
  searchParams: URLSearchParams,
): Promise<void> => {
  const referencesSkip = BigInt(searchParams.get("r") || 0);

  if (referencesSkip > 0n) {
    result.references = (
      await client.execute(
        "SELECT * FROM reference WHERE id <= ? " +
          "ORDER BY id DESC LIMIT " +
          (SELECT_LIMIT + 1),
        [referencesSkip],
      )
    ).rows;

    result.backReference = (
      await client.execute(
        "SELECT r.* FROM (" +
          "SELECT id FROM reference WHERE id > ? " +
          "ORDER BY id ASC LIMIT " +
          SELECT_LIMIT +
          ") AS r ORDER BY id DESC LIMIT 1",
        [referencesSkip],
      )
    ).rows[0]?.id;
  } else {
    result.references = (
      await client.execute(
        "SELECT * FROM reference " +
          "ORDER BY id DESC LIMIT " +
          (SELECT_LIMIT + 1),
      )
    ).rows;
  }
};

export const index: Middleware = async (ctx, _) => {
  const result: Result = {};
  const searchParams = ctx.url.searchParams;

  await files(result, searchParams);
  await drafts(result, searchParams);
  await published(result, searchParams);
  await references(result, searchParams);

  ctx.res = cborResponse(result);
};
