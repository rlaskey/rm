import { useEffect, useState } from "preact/hooks";
import { cborDecode } from "../../src/cbor-decode.ts";
import { anArticle, dateToLocal } from "../data.ts";
import { SupportedArraysCBOR } from "../../src/cbor.ts";

const Articles = (props: { w: string } = { w: "Drafts" }) => {
  const [articles, setArticles] = useState<
    Record<string, typeof anArticle.valueType>[]
  >();

  useEffect(() => {
    fetch("/3/articles/" + props.w.toLowerCase()).then(async (res) =>
      setArticles(
        (cborDecode(await res.bytes()) as SupportedArraysCBOR).map((a) =>
          anArticle.mapToRecord(a) as Record<string, typeof anArticle.valueType>
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
              <a href={"/w/article/" + a.id}>
                #{String(a.id).padStart(3, "0")}
              </a>
              {a.published && " -- " + dateToLocal(a.published as Date)}
              {a.title && " -- " + a.title}
              {a.markdown && " -- " + a.markdown}
            </li>
          ))}
      </menu>
    </>
  );
};

const ArticleIndex = () => (
  <>
    <h2>Articles</h2>
    <Articles w="Drafts" />
    <Articles w="Published" />
    <p>
      <a href="/w/article">CREATE</a>.
    </p>
  </>
);

export const Index = () => (
  <>
    <ArticleIndex />
  </>
);
