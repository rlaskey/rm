import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso/router";

import {
  type SupportedArraysCBOR,
  type SupportedMapsCBOR,
} from "../../src/cbor.ts";

import { cborDecode } from "../../src/cbor-decode.ts";

import { aFile, anArticle, aReference } from "./data.ts";

export const useIndex = () => {
  const [files, setFiles] = useState<
    Record<string, typeof aFile.valueType>[]
  >([]);
  const [backFile, setBackFile] = useState<bigint | undefined>();

  const [drafts, setDrafts] = useState<
    Record<string, typeof anArticle.valueType>[]
  >([]);
  const [backDraft, setBackDraft] = useState(0n);

  const [published, setPublished] = useState<
    Record<string, typeof anArticle.valueType>[]
  >([]);
  const [backPublished, setBackPublished] = useState<
    [bigint, bigint] | undefined
  >();

  const [references, setReferences] = useState<
    Record<string, typeof aReference.valueType>[]
  >([]);
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
        (r.get("files") as SupportedArraysCBOR).map((x) =>
          aFile.networkToState(x) as Record<string, typeof aFile.valueType>
        ),
      );
      setBackFile(BigInt((r.get("backFile") as bigint | undefined) || 0n));

      setDrafts(
        (r.get("drafts") as SupportedArraysCBOR).map((x) =>
          anArticle.networkToState(x) as Record<
            string,
            typeof anArticle.valueType
          >
        ),
      );
      setBackDraft(BigInt((r.get("backDraft") as bigint | undefined) || 0n));

      setPublished(
        (r.get("published") as SupportedArraysCBOR).map((x) =>
          anArticle.networkToState(x) as Record<
            string,
            typeof anArticle.valueType
          >
        ),
      );
      setBackPublished(r.get("backPublished") as typeof backPublished);

      setReferences(
        (r.get("references") as SupportedArraysCBOR).map((x) =>
          aReference.networkToState(x) as Record<
            string,
            typeof aReference.valueType
          >
        ),
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
