import { useState } from "preact/hooks";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborRequestInit } from "../../src/cbor-encode.ts";

import { anArticle, dateToLocal } from "../src/data.ts";
import { Status, statusState } from "../src/status.tsx";
import { useArticle } from "../src/use-article.ts";

import { PairArticles } from "./w-article/pair-articles.tsx";
import { ArticleReferences } from "./w-article/article-references.tsx";

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

  const submit = (event: Event) => {
    event.preventDefault();
    setStatus(statusState());
    const form = event.currentTarget as HTMLFormElement;

    if (article.id) {
      const payload = new Map<string, typeof anArticle.valueType>();
      anArticle.schema.forEach((c) => {
        const element = form.elements.namedItem(c.name) as
          | HTMLFormElement
          | null;
        if (!element) return;

        const now = c.browserToNetwork(element.value);
        if (now === anArticle.stateToNetwork(article[c.name])) return;

        payload.set(c.name, now);
      });

      if (!payload.size) {
        setStatus(statusState("Nothing to save.", "warning"));
        return;
      }

      fetch(
        "/3/article/" + String(BigInt(article.id as number | bigint)),
        cborRequestInit(payload),
      ).then(async (res) => {
        if (!res.ok) throw new Error(await res.text() || "Save failed.");
        setArticle(
          anArticle.networkToState(cborDecode(await res.bytes())) as Record<
            string,
            typeof anArticle.valueType
          >,
        );
        setStatus(statusState("Saved."));
      }).catch((e: Error) => {
        setStatus(statusState(String(e.message || e), "error"));
      });
    } else {
      const payload = new Map<string, string | bigint | null>();
      anArticle.schema.forEach((c) => {
        const element = form.elements.namedItem(c.name) as
          | HTMLFormElement
          | null;
        if (element) payload.set(c.name, c.browserToNetwork(element.value));
      });

      fetch("/3/article", cborRequestInit(payload))
        .then(async (res) => {
          const d = cborDecode(await res.bytes()) as number | bigint;
          location.route("/w/article/" + d);
        }).catch((e) =>
          setStatus(statusState(String(e.message || e), "error"))
        );
    }
  };

  return (
    <>
      <h1>Article{article.id && ": " + String(article.id).padStart(4, "0")}</h1>
      <form onSubmit={submit}>
        <textarea required name="words" rows={7}>
          {article.words}
        </textarea>

        <label>
          Published. Clear out to make this a Draft.
          <input
            type="datetime-local"
            name="published"
            value={dateToLocal(article.published as Date)}
          />
        </label>

        <label>
          Title
          <input type="text" name="title" value={article.title as string} />
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
            articleId={article.id as bigint}
            {...{ references, setReferences }}
          />

          <hr />
          <PairArticles
            articleId={article.id as bigint}
            {...{ articles, setArticles }}
          />
        </>
      )}
    </>
  );
};
