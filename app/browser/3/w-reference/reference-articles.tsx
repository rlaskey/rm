import { z } from "zod";

import { useState } from "preact/hooks";

import type { SupportedMapsCBOR } from "../../../src/cbor.ts";

import { cborRequestInit } from "../../../src/cbor-encode.ts";
import { cborDecode } from "../../../src/cbor-decode.ts";

import { dbArticle, mapToZodObject } from "../../src/data.ts";
import { ArticleA } from "../../src/article.tsx";

export const ReferenceArticles = (
  props: {
    referenceId: bigint;
    articles: z.infer<typeof dbArticle>[];
    setArticles: (value: z.infer<typeof dbArticle>[]) => void;
  },
) => {
  const [found, setFound] = useState<z.infer<typeof dbArticle>[]>([]);

  const unlink = (articleId: bigint) => () =>
    fetch(
      `/3/articleReference?articleId=${articleId}&referenceId=${props.referenceId}`,
      { method: "DELETE" },
    ).then(() =>
      props.setArticles(props.articles.filter((a) => a.id !== articleId))
    );

  const link = (article: z.infer<typeof dbArticle>) => () =>
    fetch(
      "/3/articleReference",
      cborRequestInit({
        article_id: article.id,
        reference_id: props.referenceId,
      }),
    ).then(() => {
      props.setArticles([...props.articles, article]);
      setFound(found.filter((f) => f.id !== article.id));
    });

  const search = (event: Event) => {
    event.preventDefault();

    const q = ((event.currentTarget as HTMLFormElement).elements.namedItem(
      "search",
    ) as HTMLInputElement).value;
    if (!q) return;

    fetch(
      "/2/q/a",
      cborRequestInit({ q, omit: props.articles.map((s) => s.id) }),
    )
      .then(async (res) =>
        setFound(
          (cborDecode(await res.bytes()) as SupportedMapsCBOR[]).map((a) => {
            const spr = mapToZodObject(a, dbArticle);
            if (!spr.success) throw new Error(spr.error.message);
            return spr.data;
          }),
        )
      );
  };

  return (
    <>
      <h2>Related Articles</h2>

      <ul>
        {props.articles.map((a) => (
          <p key={a.id}>
            <button
              type="button"
              className="danger"
              onClick={unlink(a.id as bigint)}
            >
              Unlink
            </button>
            <ArticleA prefix="/w/a/" a={a} />
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
            <ArticleA prefix="/w/a/" a={a} />
          </p>
        ))}
        <p>
          <button type="submit">Search</button>
        </p>
      </form>
    </>
  );
};
