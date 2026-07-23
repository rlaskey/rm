import { z } from "zod";

import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import type { SupportedMapsCBOR } from "../../src/cbor.ts";

import { cborDecode } from "../../src/cbor-decode.ts";

import { dbFile, mapToZodObject } from "./data.ts";

export const useFile = () => {
  const [file, setFile] = useState<(z.infer<typeof dbFile>) | null>(null);

  const route = useRoute();
  const location = useLocation();

  useEffect(() => {
    if (route.params.id) {
      fetch("/2/file/" + route.params.id).then(
        async (res) => {
          const r = cborDecode(await res.bytes()) as SupportedMapsCBOR;
          const spr = mapToZodObject(
            r.get("file") as SupportedMapsCBOR,
            dbFile,
          );
          if (!spr.success) throw new Error(spr.error.message);
          setFile(spr.data);
        },
      );
    }
  }, [location.url]);

  return { file, setFile };
};
