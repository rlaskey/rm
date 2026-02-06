import { useState } from "preact/hooks";

import { cborRequestInit } from "../../../src/cbor-encode.ts";
import { cborDecode } from "../../../src/cbor-decode.ts";

import { SupportedArraysCBOR } from "../../../src/cbor.ts";

import { anArticle, dateToLocal } from "../../src/data.ts";

export const LinkArticles = (
  props: {
    referenceId: number;
    articles: Record<string, typeof anArticle.valueType>[];
  },
) => {
  const [saved, setSaved] = useState<
    Record<string, typeof anArticle.valueType>[]
  >(props.articles);
  const [found, setFound] = useState<
    Record<string, typeof anArticle.valueType>[]
  >([]);

  const unlink = (articleId: bigint) => () =>
    fetch(
      `/3/articleReference?articleId=${articleId}&referenceId=${props.referenceId}`,
      { method: "DELETE" },
    ).then(() => setSaved(saved.filter((s) => s.id !== articleId)));

  const link = (article: Record<string, typeof anArticle.valueType>) => () =>
    fetch(
      "/3/articleReference",
      cborRequestInit({
        article_id: article.id,
        reference_id: props.referenceId,
      }),
    ).then(() => {
      setSaved([...saved, article]);
      setFound(found.filter((f) => f.id !== article.id));
    });

  const search = (event: Event) => {
    event.preventDefault();

    const q = ((event.currentTarget as HTMLFormElement).elements.namedItem(
      "search",
    ) as HTMLInputElement).value;
    if (!q) return;

    fetch("/2/q/a", cborRequestInit({ q, omit: saved.map((s) => s.id) }))
      .then(async (res) =>
        setFound(
          (cborDecode(await res.bytes()) as SupportedArraysCBOR).map((a) =>
            anArticle.networkToState(a) as Record<
              string,
              typeof anArticle.valueType
            >
          ),
        )
      );
  };

  return (
    <>
      <h2>Links: Articles</h2>

      <ul>
        {saved.map((a) => (
          <p key={a.id}>
            <button
              type="button"
              className="danger"
              onClick={unlink(a.id as bigint)}
            >
              Unlink
            </button>
            #{a.id}
            {a.published && " -- " + dateToLocal(a.published as Date)}
            {a.title && " -- " + a.title}
            {a.words && " -- " + a.words}
          </p>
        ))}
      </ul>

      <form onSubmit={search}>
        <label>
          Search
          <input type="search" name="search" minLength={1} />
        </label>

        {found.map((a) => (
          <p key={a.id}>
            <button type="button" onClick={link(a)}>Link</button>
            #{a.id}
            {a.published && " -- " + dateToLocal(a.published as Date)}
            {a.title && " -- " + a.title}
            {a.words && " -- " + a.words}
          </p>
        ))}
        <p>
          <button type="submit">Search</button>
        </p>
      </form>
    </>
  );
};
