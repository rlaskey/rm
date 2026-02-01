import { useEffect, useState } from "preact/hooks";

import { cborDecode } from "../../src/cbor-decode.ts";
import { SupportedArraysCBOR } from "../../src/cbor.ts";

import { aReference } from "../data.ts";

export const References = (props: { p: string } = { p: "/r/r/" }) => {
  const [references, setReferences] = useState<
    Record<string, typeof aReference.valueType>[]
  >();

  useEffect(() => {
    fetch("/2/references").then(async (res) =>
      setReferences(
        (cborDecode(await res.bytes()) as SupportedArraysCBOR).map((a) =>
          aReference.networkToState(a) as Record<
            string,
            typeof aReference.valueType
          >
        ),
      )
    );
  }, []);

  return (
    <>
      <h2>References</h2>
      <menu>
        {references &&
          references.map((r) => (
            <li key={r.id}>
              <a href={props.p + r.id}>
                #{String(r.id).padStart(3, "0")}
              </a>{" "}
              {r.name}
            </li>
          ))}
      </menu>
    </>
  );
};
