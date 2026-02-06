import { useState } from "preact/hooks";

import { cborRequestInit } from "../../../src/cbor-encode.ts";
import { cborDecode } from "../../../src/cbor-decode.ts";

import { SupportedArraysCBOR } from "../../../src/cbor.ts";

import { aReference } from "../../src/data.ts";

export const LinkReferences = (
  props: {
    referenceId: number;
    references: Record<string, typeof aReference.valueType>[];
  },
) => {
  const [saved, setSaved] = useState<
    Record<string, typeof aReference.valueType>[]
  >(props.references);
  const [found, setFound] = useState<
    Record<string, typeof aReference.valueType>[]
  >([]);

  const unpair = (referenceId: bigint) => () =>
    fetch(
      `/3/referencePair?id=${referenceId}&id=${props.referenceId}`,
      { method: "DELETE" },
    ).then(() => setSaved(saved.filter((s) => s.id !== referenceId)));

  const pair = (reference: Record<string, typeof aReference.valueType>) => () =>
    fetch(
      "/3/referencePair",
      cborRequestInit([reference.id, props.referenceId]),
    ).then(() => {
      setSaved([...saved, reference]);
      setFound(found.filter((f) => f.id !== reference.id));
    });

  const search = (event: Event) => {
    event.preventDefault();

    const q = ((event.currentTarget as HTMLFormElement).elements.namedItem(
      "search",
    ) as HTMLInputElement).value;
    if (!q) return;

    fetch(
      "/2/q/r",
      cborRequestInit({
        q,
        omit: [...saved.map((s) => s.id), props.referenceId],
      }),
    )
      .then(async (res) =>
        setFound(
          (cborDecode(await res.bytes()) as SupportedArraysCBOR).map((a) =>
            aReference.networkToState(a) as Record<
              string,
              typeof aReference.valueType
            >
          ),
        )
      );
  };

  return (
    <>
      <h2>Links: References</h2>

      <ul>
        {saved.map((r) => (
          <p key={r.id}>
            <button
              type="button"
              className="danger"
              onClick={unpair(r.id as bigint)}
            >
              Unlink
            </button>
            #{String(r.id).padStart(4, "0")} {r.name}
          </p>
        ))}
      </ul>

      <form onSubmit={search}>
        <label>
          Search
          <input type="search" name="search" minLength={1} />
        </label>

        {found.map((r) => (
          <p key={r.id}>
            <button type="button" className="danger" onClick={pair(r)}>
              Link
            </button>
            #{String(r.id).padStart(4, "0")} {r.name}
          </p>
        ))}
        <p>
          <button type="submit">Search</button>
        </p>
      </form>
    </>
  );
};
