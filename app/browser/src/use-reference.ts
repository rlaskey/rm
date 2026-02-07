import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import { cborDecode } from "../../src/cbor-decode.ts";
import { SupportedArraysCBOR, SupportedMapsCBOR } from "../../src/cbor.ts";

import { aLabeledURL, anArticle, aReference } from "./data.ts";

export const useReference = () => {
  const [reference, setReference] = useState<
    Record<string, typeof aReference.valueType>
  >({});
  const [labeledURLs, setLabeledURLs] = useState<
    Record<string, typeof aLabeledURL.valueType>[]
  >([]);
  const [articles, setArticles] = useState<
    Record<string, typeof anArticle.valueType>[]
  >([]);
  const [references, setReferences] = useState<
    Record<string, typeof aReference.valueType>[]
  >([]);

  const route = useRoute();
  const location = useLocation();

  useEffect(() => {
    if (route.params.id) {
      fetch("/2/reference/" + route.params.id).then(
        async (res) => {
          const r = cborDecode(await res.bytes()) as SupportedMapsCBOR;
          setReference(
            aReference.networkToState(r.get("reference")) as Record<
              string,
              typeof aReference.valueType
            >,
          );

          setLabeledURLs(
            (r.get("labeledURLs") as SupportedArraysCBOR).map((x) =>
              aLabeledURL.networkToState(x) as Record<
                string,
                typeof aLabeledURL.valueType
              >
            ),
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
        },
      );
    }
  }, [location.url]);

  return {
    articles,
    setArticles,
    labeledURLs,
    setLabeledURLs,
    reference,
    setReference,
    references,
    setReferences,
    location,
  };
};
