import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import { cborDecode } from "../../src/cbor-decode.ts";
import { SupportedArraysCBOR } from "../../src/cbor.ts";

import { aLabeledURL, aReference } from "../src/data.ts";

export const ReadReference = () => {
  const [reference, setReference] = useState(
    {} as Record<string, typeof aReference.valueType>,
  );
  const [labeledURLs, setlabeledURLs] = useState(
    [] as Record<string, typeof aLabeledURL.valueType>[],
  );

  const location = useLocation();
  const route = useRoute();

  useEffect(() => {
    if (route.params.id) {
      fetch("/2/reference/" + route.params.id).then(
        async (res) =>
          setReference(
            aReference.networkToState(cborDecode(await res.bytes())) as Record<
              string,
              typeof aReference.valueType
            >,
          ),
      );

      fetch("/2/urls/" + route.params.id).then(
        async (res) =>
          setlabeledURLs(
            (cborDecode(await res.bytes()) as SupportedArraysCBOR).map((x) =>
              aLabeledURL.networkToState(x) as Record<
                string,
                typeof aLabeledURL.valueType
              >
            ),
          ),
      );
    }
  }, [location.url]);

  return (
    <>
      <h1>Reference{reference.id && "/" + reference.id}</h1>

      <h2>{reference.name}</h2>

      <ul>
        {labeledURLs.map((u) => (
          <li key={u.id}>
            <a href={u.id as string}>
              {(new URL(u.id as string)).host}
            </a>
            {u.label}
          </li>
        ))}
      </ul>
    </>
  );
};
