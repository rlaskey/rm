import { z } from "zod";

import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import type { SupportedMapsCBOR } from "../../src/cbor.ts";

import { cborDecode } from "../../src/cbor-decode.ts";

import { dbArticle, dbReference, dbURL, mapToZodObject } from "./data.ts";

export const useReference = () => {
  const [reference, setReference] = useState<z.infer<typeof dbReference>>();
  const [labeledURLs, setLabeledURLs] = useState<(z.infer<typeof dbURL>)[]>([]);
  const [articles, setArticles] = useState<(z.infer<typeof dbArticle>)[]>(
    [],
  );
  const [references, setReferences] = useState<(z.infer<typeof dbReference>)[]>(
    [],
  );

  const route = useRoute();
  const location = useLocation();

  useEffect(() => {
    if (route.params.id) {
      fetch("/2/reference/" + route.params.id).then(
        async (res) => {
          const r = cborDecode(await res.bytes()) as SupportedMapsCBOR;
          const sprR = mapToZodObject(
            r.get("reference") as SupportedMapsCBOR,
            dbReference,
          );
          if (!sprR.success) throw new Error(sprR.error.message);
          setReference(sprR.data);

          setLabeledURLs(
            (r.get("labeledURLs") as SupportedMapsCBOR[]).map((x) => {
              const spr = mapToZodObject(x, dbURL);
              if (!spr.success) throw new Error(spr.error.message);
              return spr.data;
            }),
          );

          setArticles(
            (r.get("articles") as SupportedMapsCBOR[]).map((x) => {
              const spr = mapToZodObject(x, dbArticle);
              if (!spr.success) throw new Error(spr.error.message);
              return spr.data;
            }),
          );

          setReferences(
            (r.get("references") as SupportedMapsCBOR[]).map((x) => {
              const spr = mapToZodObject(x, dbReference);
              if (!spr.success) throw new Error(spr.error.message);
              return spr.data;
            }),
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
