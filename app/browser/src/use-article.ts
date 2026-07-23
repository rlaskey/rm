import { z } from "zod";

import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import type { SupportedMapsCBOR } from "../../src/cbor.ts";

import { cborDecode } from "../../src/cbor-decode.ts";

import { dbArticle, dbReference, mapToZodObject } from "./data.ts";

export const uArticle = dbArticle.partial({ id: true });

export const useArticle = () => {
  const [article, setArticle] = useState<z.infer<typeof uArticle>>({
    words: "",
    published: null,
    title: null,
  });
  const [articles, setArticles] = useState<(z.infer<typeof dbArticle>)[]>(
    [],
  );
  const [references, setReferences] = useState<(z.infer<typeof dbReference>)[]>(
    [],
  );

  const route = useRoute();
  const location = useLocation();

  useEffect(() => {
    if (!route.params.id) return;

    fetch("/2/article/" + route.params.id).then(async (res) => {
      const r = cborDecode(await res.bytes()) as SupportedMapsCBOR;
      const sprA = mapToZodObject(
        r.get("article") as SupportedMapsCBOR,
        dbArticle,
      );
      if (!sprA.success) throw new Error(sprA.error.message);
      setArticle(sprA.data);

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
