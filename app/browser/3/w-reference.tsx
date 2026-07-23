import { useState } from "preact/hooks";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborRequestInit } from "../../src/cbor-encode.ts";

import {
  dbReference,
  formElementsToZodObject,
  mapToZodObject,
} from "../src/data.ts";
import { Status, statusState } from "../src/status.tsx";
import { useReference } from "../src/use-reference.ts";

import { LabeledURLs } from "./w-reference/url.tsx";
import { ReferenceArticles } from "./w-reference/reference-articles.tsx";
import { PairReferences } from "./w-reference/pair-references.tsx";
import { SupportedMapsCBOR } from "../../src/cbor.ts";

export const WriteReference = () => {
  const {
    articles,
    setArticles,
    labeledURLs,
    setLabeledURLs,
    reference,
    setReference,
    references,
    setReferences,
    location,
  } = useReference();
  const [status, setStatus] = useState(statusState());

  const submit = (event: Event) => {
    event.preventDefault();
    setStatus(statusState(""));
    const form = event.currentTarget as HTMLFormElement;

    if (reference?.id) {
      const sprI = formElementsToZodObject(
        form.elements,
        dbReference.omit({ id: true }),
      );
      if (!sprI.success) return setStatus(statusState(sprI.error.message));

      fetch(
        "/3/reference/" + String(BigInt(reference.id as number | bigint)),
        cborRequestInit(sprI.data),
      ).then(async (res) => {
        if (!res.ok) throw new Error(await res.text() || "Save failed.");
        const spr = mapToZodObject(
          cborDecode(await res.bytes()) as SupportedMapsCBOR,
          dbReference,
        );
        if (!spr.success) throw new Error(spr.error.message);
        setReference(spr.data);
        setStatus(statusState("Saved."));
      }).catch((e: Error) => {
        setStatus(statusState(String(e.message || e), "error"));
      });
    } else {
      const sprI = formElementsToZodObject(
        form.elements,
        dbReference.omit({ id: true }),
      );
      if (!sprI.success) return setStatus(statusState(sprI.error.message));

      fetch("/3/reference", cborRequestInit(sprI.data))
        .then(async (res) => {
          const d = cborDecode(await res.bytes()) as number | bigint;
          location.route("/w/r/" + d);
        }).catch((e) =>
          setStatus(statusState(String(e.message || e), "error"))
        );
    }
  };

  return (
    <>
      <h1>
        Reference{reference && ": " + String(reference.id).padStart(4, "0")}
      </h1>
      <form onSubmit={submit}>
        <label>
          Name
          <input
            type="text"
            required
            name="name"
            value={reference?.name}
          />
        </label>

        <Status {...status} />
        <p>
          <button type="submit">Save</button>
        </p>
      </form>

      {reference && (
        <>
          <hr />
          <LabeledURLs
            referenceId={reference.id}
            {...{ labeledURLs, setLabeledURLs }}
          />

          <hr />
          <ReferenceArticles
            referenceId={reference.id}
            {...{ articles, setArticles }}
          />

          <hr />
          <PairReferences
            referenceId={BigInt(reference.id)}
            {...{ references, setReferences }}
          />
        </>
      )}
    </>
  );
};
