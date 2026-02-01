import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import { aReference } from "../data.ts";

import { cborDecode } from "../../src/cbor-decode.ts";

export const ReadReference = () => {
  const [reference, setReference] = useState(
    {} as Record<string, typeof aReference.valueType>,
  );

  const location = useLocation();
  const route = useRoute();

  useEffect(() => {
    if (route.params.id) {
      fetch("/2/reference/" + String(BigInt(route.params.id))).then(
        async (res) =>
          setReference(
            aReference.networkToState(cborDecode(await res.bytes())) as Record<
              string,
              typeof aReference.valueType
            >,
          ),
      );
    }
  }, [location.url]);

  return (
    <>
      <h1>Reference{reference.id && "/" + reference.id}</h1>

      <h2>{reference.name}</h2>

      {aReference.schema.filter((c) =>
        c.options.has("null") && c.t === "string" && reference[c.name]
      ).map((c) => (
        <p key={c.name}>
          <a href={reference[c.name] as string}>{reference[c.name]}</a>
        </p>
      ))}
    </>
  );
};
