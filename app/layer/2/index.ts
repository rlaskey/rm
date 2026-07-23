import { SELECT_LIMIT } from "../../browser/src/site.ts";

import { type Middleware } from "../../src/framework.ts";

import { cborResponse } from "../../src/cbor-encode.ts";
import { db } from "../../src/sqlite.ts";

type Result = Record<string, unknown>;

const files = (result: Result, searchParams: URLSearchParams): void => {
  const filesSkip = BigInt(searchParams.get("f") || 0);

  if (filesSkip > 0n) {
    result.files = db.prepare(
      "SELECT * FROM file WHERE id <= ? " +
        "ORDER BY id DESC LIMIT " + (SELECT_LIMIT + 1),
    ).all(filesSkip);

    result.backFile = db.prepare(
      "SELECT r.* FROM (" +
        "SELECT id FROM file WHERE id > ? " +
        "ORDER BY id ASC LIMIT " + SELECT_LIMIT +
        ") AS r ORDER BY id DESC LIMIT 1",
    ).get(filesSkip)?.id;
  } else {
    result.files = db.prepare(
      "SELECT * FROM file " +
        "ORDER BY id DESC LIMIT " + (SELECT_LIMIT + 1),
    ).all();
  }
};

const drafts = (result: Result, searchParams: URLSearchParams): void => {
  const draftsSkip = BigInt(searchParams.get("d") || 0);
  result.drafts = db.prepare(
    "SELECT id, title, SUBSTR(words, 0, 43) AS words " +
      "FROM article " +
      "WHERE published IS NULL AND id >= ? " +
      "ORDER BY id ASC LIMIT " + (SELECT_LIMIT + 1),
  ).all(draftsSkip);

  if (draftsSkip > 0n) {
    result.backDraft = db.prepare(
      "SELECT r.* FROM (" +
        "SELECT id FROM article " +
        "WHERE published IS NULL AND id < ? " +
        "ORDER BY id DESC LIMIT " + SELECT_LIMIT +
        ") AS r ORDER BY r.id ASC LIMIT 1",
    ).get(draftsSkip)?.id;
  }
};

const published = (result: Result, searchParams: URLSearchParams): void => {
  const skipPublished = searchParams.get("pPublished");
  const skipPublishedID = searchParams.get("pID");
  if (skipPublished !== null && skipPublishedID !== null) {
    result.published = db.prepare(
      "SELECT id, published, title, SUBSTR(words, 0, 43) AS words " +
        "FROM article " +
        "WHERE published IS NOT NULL AND " +
        "(published < ? OR (published = ? AND id >= ?)) " +
        "ORDER BY published DESC, id ASC LIMIT " + (SELECT_LIMIT + 1),
    ).all(skipPublished, skipPublished, skipPublishedID);

    const row = db.prepare(
      "SELECT r.* FROM (" +
        "SELECT published, id FROM article " +
        "WHERE published IS NOT NULL AND " +
        "(published > ? OR (published = ? AND id < ?)) " +
        "ORDER BY published ASC, id DESC LIMIT " + SELECT_LIMIT +
        ") AS r ORDER BY r.published DESC, id ASC LIMIT 1",
    ).get(
      skipPublished,
      skipPublished,
      skipPublishedID,
    );
    result.backPublished = row ? [row.published, row.id] : undefined;
  } else {
    result.published = db.prepare(
      "SELECT id, published, title, SUBSTR(words, 0, 43) AS words " +
        "FROM article " +
        "WHERE published IS NOT NULL " +
        "ORDER BY published DESC, id ASC LIMIT " + (SELECT_LIMIT + 1),
    ).all();
  }
};

const references = (result: Result, searchParams: URLSearchParams): void => {
  const referencesSkip = BigInt(searchParams.get("r") || 0);

  if (referencesSkip > 0n) {
    result.references = db.prepare(
      "SELECT * FROM reference WHERE id <= ? " +
        "ORDER BY id DESC LIMIT " + (SELECT_LIMIT + 1),
    ).all(referencesSkip);

    result.backReference = db.prepare(
      "SELECT r.* FROM (" +
        "SELECT id FROM reference WHERE id > ? " +
        "ORDER BY id ASC LIMIT " + SELECT_LIMIT +
        ") AS r ORDER BY id DESC LIMIT 1",
    ).get(referencesSkip)?.id;
  } else {
    result.references = db.prepare(
      "SELECT * FROM reference " +
        "ORDER BY id DESC LIMIT " + (SELECT_LIMIT + 1),
    ).all();
  }
};

export const index: Middleware = (ctx, _) => {
  const result: Result = {};
  const searchParams = ctx.url.searchParams;

  files(result, searchParams);
  drafts(result, searchParams);
  published(result, searchParams);
  references(result, searchParams);

  ctx.res = cborResponse(result);
};
