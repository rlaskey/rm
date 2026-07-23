import { useState } from "preact/hooks";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborRequestInit } from "../../src/cbor-encode.ts";

import { formElementsToZodObject, mapToZodObject } from "../src/data.ts";
import { epochSecondsToLocal } from "../src/dates.ts";
import { Status, statusState } from "../src/status.tsx";
import { uArticle, useArticle } from "../src/use-article.ts";

import { PairArticles } from "./w-article/pair-articles.tsx";
import { ArticleReferences } from "./w-article/article-references.tsx";
import { SupportedMapsCBOR } from "../../src/cbor.ts";

export const WriteArticle = () => {
  const {
    article,
    setArticle,
    articles,
    setArticles,
    references,
    setReferences,
    location,
  } = useArticle();

  const [status, setStatus] = useState(statusState());

  const publishedNull = (event: Event): void => {
    event.preventDefault();
    setArticle({ ...article, published: null });
  };

  const publishedMeow = (event: Event): void => {
    event.preventDefault();
    setArticle({
      ...article,
      published: BigInt(Math.floor((new Date()).getTime() / 1000)),
    });
  };

  const submit = (event: Event) => {
    event.preventDefault();
    setStatus(statusState());
    const form = event.currentTarget as HTMLFormElement;

    if (article.id) {
      const sprI = formElementsToZodObject(form.elements, uArticle);
      if (!sprI.success) {
        setStatus(statusState(sprI.error.message));
        return;
      }

      fetch(
        "/3/article/" + String(BigInt(article.id as number | bigint)),
        cborRequestInit(sprI.data),
      ).then(async (res) => {
        if (!res.ok) throw new Error((await res.text()) || "Save failed.");
        const sprO = mapToZodObject(
          cborDecode(await res.bytes()) as SupportedMapsCBOR,
          uArticle,
        );
        if (!sprO.success) throw new Error(sprO.error.message);

        setArticle(sprO.data);
        setStatus(statusState("Saved."));
      }).catch((e: Error) => {
        setStatus(statusState(String(e.message || e), "error"));
      });
    } else {
      const sprU = formElementsToZodObject(form.elements, uArticle);
      if (!sprU.success) {
        setStatus(statusState(sprU.error.message));
        return;
      }

      fetch("/3/article", cborRequestInit(sprU.data))
        .then(async (res) => {
          if (!res.ok) throw new Error((await res.text()) || "Update failed.");
          const d = cborDecode(await res.bytes()) as number | bigint;
          location.route("/w/a/" + d);
        })
        .catch((e) => setStatus(statusState(String(e.message || e), "error")));
    }
  };

  return (
    <>
      <h1>
        Article{article.id && ": " + String(article.id).padStart(4, "0")}
      </h1>
      <form onSubmit={submit}>
        <textarea required name="words" rows={7}>
          {article.words}
        </textarea>

        <div>
          Published timestamp. {article.published !== null
            ? (
              <>
                <button
                  type="button"
                  className="danger"
                  onClick={publishedNull}
                >
                  Clear
                </button>
                <input
                  type="datetime-local"
                  name="published"
                  value={epochSecondsToLocal(article.published)}
                />
              </>
            )
            : (
              <>
                <button type="button" onClick={publishedMeow}>
                  Set
                </button>
                <input type="text" name="published" value="" readOnly />
              </>
            )}
        </div>

        <label>
          Title
          <input type="text" name="title" value={article.title || ""} />
        </label>

        <Status {...status} />
        <p>
          <button type="submit">Save</button>
        </p>
      </form>

      {article.id && (
        <>
          <hr />
          <ArticleReferences
            articleId={article.id}
            {...{ references, setReferences }}
          />

          <hr />
          <PairArticles articleId={article.id} {...{ articles, setArticles }} />
        </>
      )}
    </>
  );
};
