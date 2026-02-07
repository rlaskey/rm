import { useEffect, useState } from "preact/hooks";

import { cborDecode } from "../../src/cbor-decode.ts";
import { SupportedArraysCBOR } from "../../src/cbor.ts";

import { anArticle } from "../src/data.ts";
import { ArticleA } from "../src/article.tsx";

import { References } from "./r-references.tsx";

export const Articles = (
  props: { p: string; w: string } = { p: "/r/a/", w: "Published" },
) => {
  const [articles, setArticles] = useState<
    Record<string, typeof anArticle.valueType>[]
  >();

  useEffect(() => {
    fetch("/2/articles/" + props.w.toLowerCase()).then(async (res) =>
      setArticles(
        (cborDecode(await res.bytes()) as SupportedArraysCBOR).map((a) =>
          anArticle.networkToState(a) as Record<
            string,
            typeof anArticle.valueType
          >
        ),
      )
    );
  }, []);

  return (
    <>
      <h3>{props.w}</h3>
      <menu>
        {articles &&
          articles.map((a) => (
            <li key={a.id}>
              <ArticleA prefix={props.p} a={a} />
            </li>
          ))}
      </menu>
    </>
  );
};

const ArticleIndex = () => (
  <>
    <h2>Articles</h2>
    <Articles p="/r/a/" w="Drafts" />
    <Articles p="/r/a/" w="Published" />

    <hr />

    <References p="/r/r/" />
  </>
);

export const Index = () => <ArticleIndex />;
