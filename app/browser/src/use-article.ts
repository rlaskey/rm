import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import {
  type SupportedArraysCBOR,
  type SupportedMapsCBOR,
} from "../../src/cbor.ts";

import { cborDecode } from "../../src/cbor-decode.ts";

import { anArticle, aReference } from "./data.ts";

export const useArticle = () => {
  const [article, setArticle] = useState<
    Record<string, typeof anArticle.valueType>
  >({});
  const [articles, setArticles] = useState<
    Record<string, typeof anArticle.valueType>[]
  >([]);
  const [references, setReferences] = useState<
    Record<string, typeof aReference.valueType>[]
  >([]);

  const route = useRoute();
  const location = useLocation();

  useEffect(() => {
    if (!route.params.id) return;

    fetch("/2/article/" + route.params.id).then(async (res) => {
      const r = cborDecode(await res.bytes()) as SupportedMapsCBOR;
      setArticle(
        anArticle.networkToState(r.get("article")) as Record<
          string,
          typeof anArticle.valueType
        >,
      );

      setArticles(
        (r.get("articles") as SupportedArraysCBOR).map((x) =>
          anArticle.networkToState(x) as Record<
            string,
            typeof anArticle.valueType
          >
        ),
      );

      setReferences(
        (r.get("references") as SupportedArraysCBOR).map((x) =>
          aReference.networkToState(x) as Record<
            string,
            typeof aReference.valueType
          >
        ),
      );
    });
  }, [location.url]);

  return {
    article,
    setArticle,
    articles,
    setArticles,
    references,
    setReferences,
    location,
  };
};
