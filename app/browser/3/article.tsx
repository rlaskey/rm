import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import { Article } from "../data.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborRequestInit } from "../../src/cbor-encode.ts";

export const WriteArticle = () => {
  const [article, setArticle] = useState(new Article(BigInt(0), ""));
  const [error, setError] = useState("");

  const location = useLocation();
  const route = useRoute();

  useEffect(() => {
    if (route.params.id) {
      fetch("/3/article/" + String(BigInt(route.params.id))).then(
        async (res) => {
          const d = cborDecode(await res.bytes()) as Map<
            string,
            string | bigint | null
          >;
          const result = new Article(
            d.get("id") as bigint,
            d.get("markdown") as string,
          );
          setArticle(result);
        },
      );
    }
  }, [location.url]);

  const submit = (event: Event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;

    if (article.id) {
      const payload = new Map<string, string | bigint | null>([[
        "id",
        article.id,
      ]]);
      Article.schema.forEach((c) => {
        const element = form.elements.namedItem(c.name) as
          | HTMLFormElement
          | null;
        if (element) payload.set(c.name, c.fromBrowser(element.value));
      });

      fetch(
        "/3/article/" + String(BigInt(article.id)),
        cborRequestInit(payload),
      ).then(async (res) => {
        if (!res.ok) throw new Error(await res.text() || "Save failed.");
      }).catch((error: Error) => {
        const message = (error instanceof Error) ? error.message : error;
        setError(String(message));
      });
    } else {
      const payload = new Map<string, string | bigint | null>();
      Article.schema.forEach((c) => {
        const element = form.elements.namedItem(c.name) as
          | HTMLFormElement
          | null;
        if (element) payload.set(c.name, c.fromBrowser(element.value));
      });
      fetch("/3/article", cborRequestInit(payload))
        .then(async (res) => {
          const d = cborDecode(await res.bytes()) as number | bigint;
          location.route("/w/article/" + d);
        }).catch((e) => setError(e));
    }
  };

  return (
    <>
      <h2>Article</h2>
      <form onSubmit={submit}>
        <textarea required name="markdown" rows={7}>
          {article.markdown}
        </textarea>

        <label>
          Published. Clear out to make this a Draft.
          <input
            type="datetime-local"
            name="published"
            value={article.published}
          />
        </label>

        <label>
          Title <input type="text" name="title" value={article.title} />
        </label>

        {error && <p class="error">{error}</p>}

        <button type="submit">Save</button>
      </form>
    </>
  );
};
