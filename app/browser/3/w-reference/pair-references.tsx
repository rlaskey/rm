import { z } from "zod";

import { useState } from "preact/hooks";

import type { SupportedMapsCBOR } from "../../../src/cbor.ts";

import { cborRequestInit } from "../../../src/cbor-encode.ts";
import { cborDecode } from "../../../src/cbor-decode.ts";

import { dbReference, mapToZodObject } from "../../src/data.ts";

export const PairReferences = (
  props: {
    referenceId: bigint;
    references: z.infer<typeof dbReference>[];
    setReferences: (value: (z.infer<typeof dbReference>)[]) => void;
  },
) => {
  const [found, setFound] = useState<(z.infer<typeof dbReference>)[]>([]);

  const unpair = (referenceId: bigint) => () =>
    fetch(
      `/3/referencePair?id=${referenceId}&id=${props.referenceId}`,
      { method: "DELETE" },
    ).then(() =>
      props.setReferences(props.references.filter((r) => r.id !== referenceId))
    );

  const pair = (reference: z.infer<typeof dbReference>) => () =>
    fetch(
      "/3/referencePair",
      cborRequestInit([reference.id, props.referenceId]),
    ).then(() => {
      props.setReferences([...props.references, reference]);
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
        omit: [...props.references.map((r) => r.id), props.referenceId],
      }),
    )
      .then(async (res) =>
        setFound(
          (cborDecode(await res.bytes()) as SupportedMapsCBOR[]).map((a) => {
            const spr = mapToZodObject(a, dbReference);
            if (!spr.success) throw new Error(spr.error.message);
            return spr.data;
          }),
        )
      );
  };

  return (
    <>
      <h2>Related References</h2>

      <ul>
        {props.references.map((r) => (
          <p key={r.id}>
            <button
              type="button"
              className="danger"
              onClick={unpair(r.id as bigint)}
            >
              Unlink
            </button>
            <a href={"/w/r/" + r.id}>
              #{String(r.id).padStart(4, "0")}
            </a>{" "}
            {r.name}
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
            <button type="button" onClick={pair(r)}>
              Link
            </button>
            <a href={"/w/r/" + r.id}>
              #{String(r.id).padStart(4, "0")}
            </a>{" "}
            {r.name}
          </p>
        ))}
        <p>
          <button type="submit">Search</button>
        </p>
      </form>
    </>
  );
};
