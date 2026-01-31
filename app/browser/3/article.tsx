import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import { anArticle, dateToLocal } from "../data.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborRequestInit } from "../../src/cbor-encode.ts";

export const WriteArticle = () => {
  const [article, setArticle] = useState(
    {} as Record<string, typeof anArticle.valueType>,
  );
  const [status, setStatus] = useState({ m: "", c: "", d: new Date() });

  const location = useLocation();
  const route = useRoute();

  useEffect(() => {
    if (route.params.id) {
      fetch("/3/article/" + String(BigInt(route.params.id))).then(
        async (res) =>
          setArticle(
            anArticle.mapToRecord(cborDecode(await res.bytes())) as Record<
              string,
              typeof anArticle.valueType
            >,
          ),
      );
    }
  }, [location.url]);

  const submit = (event: Event) => {
    event.preventDefault();
    setStatus({ m: "", c: "", d: new Date() });
    const form = event.currentTarget as HTMLFormElement;

    if (article.id) {
      const payload = new Map<string, typeof anArticle.valueType>();
      anArticle.schema.forEach((c) => {
        const element = form.elements.namedItem(c.name) as
          | HTMLFormElement
          | null;
        if (!element) return;

        let original = article[c.name];
        if (original instanceof Date) {
          original = BigInt(original.getTime() / 1000);
        }

        const now = c.fromBrowser(element.value);
        if (now === original) return;

        payload.set(c.name, now);
      });

      if (!payload.size) {
        setStatus({ m: "Nothing to save.", c: "warning", d: new Date() });
        return;
      }

      fetch(
        "/3/article/" + String(BigInt(article.id as number | bigint)),
        cborRequestInit(payload),
      ).then(async (res) => {
        if (!res.ok) throw new Error(await res.text() || "Save failed.");
        setArticle(
          anArticle.mapToRecord(cborDecode(await res.bytes())) as Record<
            string,
            typeof anArticle.valueType
          >,
        );
        setStatus({ m: "Saved.", c: "info", d: new Date() });
      }).catch((e: Error) => {
        setStatus({ m: String(e.message || e), c: "error", d: new Date() });
      });
    } else {
      const payload = new Map<string, string | bigint | null>();
      anArticle.schema.forEach((c) => {
        const element = form.elements.namedItem(c.name) as
          | HTMLFormElement
          | null;
        if (element) payload.set(c.name, c.fromBrowser(element.value));
      });

      fetch("/3/article", cborRequestInit(payload))
        .then(async (res) => {
          const d = cborDecode(await res.bytes()) as number | bigint;
          location.route("/w/article/" + d);
        }).catch((e) =>
          setStatus({ m: String(e.message || e), c: "error", d: new Date() })
        );
    }
  };

  return (
    <>
      <h1>A{article.id && "/" + article.id}</h1>
      <form onSubmit={submit}>
        <textarea required name="markdown" rows={7}>
          {article.markdown}
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

        {status.m && (
          <p class={status.c}>{dateToLocal(status.d)} -- {status.m}</p>
        )}

        <button type="submit">Save</button>
      </form>
    </>
  );
};
