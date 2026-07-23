import { z } from "zod";

import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso/router";

import type { SupportedMapsCBOR } from "../../src/cbor.ts";

import { cborDecode } from "../../src/cbor-decode.ts";

import { dbArticle, dbFile, dbReference, mapToZodObject } from "./data.ts";

export const useIndex = () => {
  const [files, setFiles] = useState<(z.infer<typeof dbFile>)[]>([]);
  const [backFile, setBackFile] = useState<bigint | undefined>();

  const [drafts, setDrafts] = useState<(z.infer<typeof dbArticle>)[]>([]);
  const [backDraft, setBackDraft] = useState(0n);

  const [published, setPublished] = useState<(z.infer<typeof dbArticle>)[]>(
    [],
  );
  const [backPublished, setBackPublished] = useState<
    [bigint, bigint] | undefined
  >();

  const [references, setReferences] = useState<(z.infer<typeof dbReference>)[]>(
    [],
  );
  const [backReference, setBackReference] = useState<bigint | undefined>();

  const location = useLocation();

  useEffect(() => {
    const filteredQ: Record<string, string> = {};
    ["f", "d", "pPublished", "pID", "r"].forEach((searchParam) => {
      const found = location.query[searchParam];
      if (found) filteredQ[searchParam] = found;
    });
    const searchParams = new URLSearchParams(filteredQ);
    fetch("/2?" + searchParams.toString()).then(async (res) => {
      const r = cborDecode(await res.bytes()) as SupportedMapsCBOR;

      setFiles(
        (r.get("files") as SupportedMapsCBOR[]).map((x) => {
          const spr = mapToZodObject(x, dbFile);
          if (!spr.success) throw new Error(spr.error.message);
          return spr.data;
        }),
      );
      setBackFile(BigInt((r.get("backFile") as bigint | undefined) || 0n));

      setDrafts(
        (r.get("drafts") as SupportedMapsCBOR[]).map((x) => {
          const spr = mapToZodObject(x, dbArticle);
          if (!spr.success) throw new Error(spr.error.message);
          return spr.data;
        }),
      );
      setBackDraft(BigInt((r.get("backDraft") as bigint | undefined) || 0n));

      setPublished(
        (r.get("published") as SupportedMapsCBOR[]).map((x) => {
          const spr = mapToZodObject(x, dbArticle);
          if (!spr.success) throw new Error(spr.error.message);
          return spr.data;
        }),
      );
      setBackPublished(r.get("backPublished") as typeof backPublished);

      setReferences(
        (r.get("references") as SupportedMapsCBOR[]).map((x) => {
          const spr = mapToZodObject(x, dbReference);
          if (!spr.success) throw new Error(spr.error.message);
          return spr.data;
        }),
      );
      setBackReference(r.get("backReference") as bigint | undefined);
    });
  }, [location.url]);

  return {
    files,
    backFile,
    drafts,
    backDraft,
    published,
    backPublished,
    references,
    backReference,
    location,
  };
};
