import { useState } from "preact/hooks";

import { cborRequestInit } from "../../../src/cbor-encode.ts";
import { cborDecode } from "../../../src/cbor-decode.ts";
import { SupportedArraysCBOR } from "../../../src/cbor.ts";

import { anArticle } from "../../src/data.ts";
import { ArticleA } from "../../src/article.tsx";

export const ReferenceArticles = (
  props: {
    referenceId: bigint;
    articles: Record<string, typeof anArticle.valueType>[];
    setArticles: (value: Record<string, typeof anArticle.valueType>[]) => void;
  },
) => {
  const [found, setFound] = useState<
    Record<string, typeof anArticle.valueType>[]
  >([]);

  const unlink = (articleId: bigint) => () =>
    fetch(
      `/3/articleReference?articleId=${articleId}&referenceId=${props.referenceId}`,
      { method: "DELETE" },
    ).then(() =>
      props.setArticles(props.articles.filter((a) => a.id !== articleId))
    );

  const link = (article: Record<string, typeof anArticle.valueType>) => () =>
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
            <ArticleA prefix="/w/article/" a={a} />
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
            <ArticleA prefix="/w/article/" a={a} />
          </p>
        ))}
        <p>
          <button type="submit">Search</button>
        </p>
      </form>
    </>
  );
};
