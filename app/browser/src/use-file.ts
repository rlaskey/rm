import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import { type SupportedMapsCBOR } from "../../src/cbor.ts";

import { cborDecode } from "../../src/cbor-decode.ts";

import { aFile } from "./data.ts";

export const useFile = () => {
  const [file, setFile] = useState<Record<string, typeof aFile.valueType>>({});

  const route = useRoute();
  const location = useLocation();

  useEffect(() => {
    if (route.params.id) {
      fetch("/2/file/" + route.params.id).then(
        async (res) => {
          const r = cborDecode(await res.bytes()) as SupportedMapsCBOR;
          setFile(
            aFile.networkToState(r.get("file")) as Record<
              string,
              typeof aFile.valueType
            >,
          );
        },
      );
    }
  }, [location.url]);

  return { file, setFile };
};
