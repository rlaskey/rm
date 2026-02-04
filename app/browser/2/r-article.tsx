import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import { cborDecode } from "../../src/cbor-decode.ts";

import { anArticle, dateToLocal } from "../src/data.ts";

export const ReadArticle = () => {
  const [article, setArticle] = useState(
    {} as Record<string, typeof anArticle.valueType>,
  );

  const location = useLocation();
  const route = useRoute();

  useEffect(() => {
    if (route.params.id) {
      fetch("/2/article/" + String(BigInt(route.params.id))).then(
        async (res) =>
          setArticle(
            anArticle.networkToState(cborDecode(await res.bytes())) as Record<
              string,
              typeof anArticle.valueType
            >,
          ),
      );
    }
  }, [location.url]);

  return (
    <>
      <h1>Article{article.id && "/" + article.id}</h1>
      <h2>
        {dateToLocal(article.published as Date) || "DRAFT"} {article.title}
      </h2>

      <pre>{article.words}</pre>
    </>
  );
};
