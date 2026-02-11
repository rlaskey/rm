import { SELECT_LIMIT } from "../../browser/src/site.ts";

import { type Middleware } from "../../src/framework.ts";

import { cborResponse } from "../../src/cbor-encode.ts";
import { db } from "../../src/sqlite.ts";

type Result = Record<string, unknown>;

const drafts = (result: Result, searchParams: URLSearchParams): void => {
  const draftsSkip = BigInt(searchParams.get("d") || 0);
  using stmt0 = db.prepare(
    "SELECT id, title, SUBSTR(words, 0, 43) AS words " +
      "FROM article " +
      "WHERE published IS NULL AND id >= ? " +
      "ORDER BY id ASC LIMIT " + (SELECT_LIMIT + 1),
  );
  result.drafts = stmt0.all(draftsSkip);

  if (draftsSkip > 0n) {
    using stmt1 = db.prepare(
      "SELECT r.* FROM (" +
        "SELECT id FROM article " +
        "WHERE published IS NULL AND id < ? " +
        "ORDER BY id DESC LIMIT " + SELECT_LIMIT +
        ") AS r ORDER BY r.id ASC LIMIT 1",
    );
    result.backDraft = ((stmt1.value(draftsSkip) as bigint[]) || [])[0];
  }
};

const published = (result: Result, searchParams: URLSearchParams): void => {
  const skipPublished = searchParams.get("pPublished");
  const skipPublishedID = searchParams.get("pID");
  if (skipPublished !== null && skipPublishedID !== null) {
    using stmt0 = db.prepare(
      "SELECT id, published, title, SUBSTR(words, 0, 43) AS words " +
        "FROM article " +
        "WHERE published IS NOT NULL AND " +
        "(published < ? OR (published = ? AND id >= ?)) " +
        "ORDER BY published DESC, id ASC LIMIT " + (SELECT_LIMIT + 1),
    );
    result.published = stmt0.all(skipPublished, skipPublished, skipPublishedID);

    using stmt1 = db.prepare(
      "SELECT r.* FROM (" +
        "SELECT published, id FROM article " +
        "WHERE published IS NOT NULL AND " +
        "(published > ? OR (published = ? AND id < ?)) " +
        "ORDER BY published ASC, id DESC LIMIT " + SELECT_LIMIT +
        ") AS r ORDER BY r.published DESC, id ASC LIMIT 1",
    );
    result.backPublished = stmt1.value(
      skipPublished,
      skipPublished,
      skipPublishedID,
    ) as bigint[];
  } else {
    using stmt0 = db.prepare(
      "SELECT id, published, title, SUBSTR(words, 0, 43) AS words " +
        "FROM article " +
        "WHERE published IS NOT NULL " +
        "ORDER BY published DESC, id ASC LIMIT " + (SELECT_LIMIT + 1),
    );
    result.published = stmt0.all();
  }
};

const references = (result: Result, searchParams: URLSearchParams): void => {
  const referencesSkip = BigInt(searchParams.get("r") || 0);

  if (referencesSkip > 0n) {
    using stmt0 = db.prepare(
      "SELECT * FROM reference WHERE id <= ? " +
        "ORDER BY id DESC LIMIT " + (SELECT_LIMIT + 1),
    );
    result.references = stmt0.all(referencesSkip);

    using stmt1 = db.prepare(
      "SELECT r.* FROM (" +
        "SELECT id FROM reference WHERE id > ? " +
        "ORDER BY id ASC LIMIT " + SELECT_LIMIT +
        ") AS r ORDER BY id DESC LIMIT 1",
    );
    result.backReference = ((stmt1.value(referencesSkip) as bigint[]) || [])[0];
  } else {
    using stmt0 = db.prepare(
      "SELECT * FROM reference " +
        "ORDER BY id DESC LIMIT " + (SELECT_LIMIT + 1),
    );
    result.references = stmt0.all();
  }
};

export const index: Middleware = (ctx, _) => {
  const result: Result = {};
  const searchParams = ctx.url.searchParams;

  drafts(result, searchParams);
  published(result, searchParams);
  references(result, searchParams);

  ctx.res = cborResponse(result);
};
