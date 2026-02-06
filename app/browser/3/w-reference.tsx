import { useState } from "preact/hooks";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborRequestInit } from "../../src/cbor-encode.ts";

import { aReference } from "../src/data.ts";
import { Status, statusState } from "../src/status.tsx";

import { Links } from "./w-reference/links.tsx";
import { LabeledURLs } from "./w-reference/url.tsx";
import { useReference } from "../src/reference.ts";

export const WriteReference = () => {
  const {
    articles,
    labeledURLs,
    location,
    reference,
    references,
    setReference,
  } = useReference();
  const [status, setStatus] = useState(statusState());

  const submit = (event: Event) => {
    event.preventDefault();
    setStatus(statusState(""));
    const form = event.currentTarget as HTMLFormElement;

    if (reference.id) {
      const payload = new Map<string, typeof aReference.valueType>();
      aReference.schema.forEach((c) => {
        const element = form.elements.namedItem(c.name) as
          | HTMLFormElement
          | null;
        if (!element) return;

        const n = c.browserToNetwork(element.value) as string | null;
        if (n === reference[c.name]) return;

        payload.set(c.name, n);
      });

      if (!payload.size) {
        return setStatus(statusState("Nothing to save.", "warning"));
      }

      fetch(
        "/3/reference/" + String(BigInt(reference.id as number | bigint)),
        cborRequestInit(payload),
      ).then(async (res) => {
        if (!res.ok) throw new Error(await res.text() || "Save failed.");
        setReference(
          aReference.networkToState(cborDecode(await res.bytes())) as Record<
            string,
            typeof aReference.valueType
          >,
        );
        setStatus(statusState("Saved."));
      }).catch((e: Error) => {
        setStatus(statusState(String(e.message || e), "error"));
      });
    } else {
      const payload = new Map<string, string | bigint | null>();
      aReference.schema.forEach((c) => {
        const element = form.elements.namedItem(c.name) as
          | HTMLFormElement
          | null;
        if (element) payload.set(c.name, c.browserToNetwork(element.value));
      });

      fetch("/3/reference", cborRequestInit(payload))
        .then(async (res) => {
          const d = cborDecode(await res.bytes()) as number | bigint;
          location.route("/w/reference/" + d);
        }).catch((e) =>
          setStatus(statusState(String(e.message || e), "error"))
        );
    }
  };

  return (
    <>
      <h1>
        Reference{reference.id && "/" + String(reference.id).padStart(4, "0")}
      </h1>
      <form onSubmit={submit}>
        <label>
          Name
          <input
            type="text"
            required
            name="name"
            value={reference.name as string}
          />
        </label>

        <Status {...status} />
        <p>
          <button type="submit">Save</button>
        </p>
      </form>

      {reference.id && (
        <>
          <hr />
          <LabeledURLs
            referenceId={reference.id as string}
            labeledURLs={labeledURLs}
          />
          <hr />
          <Links
            referenceId={reference.id as number}
            {...{ articles, references }}
          />
        </>
      )}
    </>
  );
};
