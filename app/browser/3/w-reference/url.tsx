import { z } from "zod";

import { useState } from "preact/hooks";

import { cborDecode } from "../../../src/cbor-decode.ts";
import { cborRequestInit } from "../../../src/cbor-encode.ts";
import type { SupportedMapsCBOR } from "../../../src/cbor.ts";

import {
  dbURL,
  formElementsToZodObject,
  mapToZodObject,
} from "../../src/data.ts";
import { Status, statusState } from "../../src/status.tsx";

export const LabeledURLs = (
  props: {
    referenceId: bigint;
    labeledURLs: (z.infer<typeof dbURL>)[];
    setLabeledURLs: (value: (z.infer<typeof dbURL>)[]) => void;
  },
) => {
  const [status, setStatus] = useState(statusState());

  const submit = (event: Event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;

    const sprI = formElementsToZodObject(
      form.elements,
      dbURL.partial({ id: true, reference_id: true }),
    );
    if (!sprI.success) throw new Error(sprI.error.message);

    const payload = new Map<string, unknown>([
      ...Object.entries(sprI.data),
      ["reference_id", props.referenceId],
      [
        "originalId",
        (form.elements.namedItem("originalId") as HTMLFormElement).value,
      ],
    ]);

    fetch("/3/url", cborRequestInit(payload)).then(async (res) => {
      if (!res.ok) throw new Error(await res.text() || "Save failed.");
      props.setLabeledURLs(
        (cborDecode(await res.bytes()) as SupportedMapsCBOR[]).map((x) => {
          const spr = mapToZodObject(x, dbURL);
          if (!spr.success) throw new Error(spr.error.message);
          return spr.data;
        }),
      );
      setStatus(statusState("Saved."));
    }).catch((e: Error) => {
      setStatus(statusState(String(e.message || e), "error"));
    });
  };

  return (
    <>
      <h2>URLs</h2>
      <Status {...status} />

      {props.labeledURLs.map((u) => (
        <form onSubmit={submit}>
          <input type="hidden" name="originalId" value={u.id} />

          <label>
            URL <input type="url" name="id" value={u.id} />
          </label>

          <label>
            Label <input type="text" name="label" value={u.label ?? ""} />
          </label>
          <p>
            <button type="submit">Save</button>
          </p>
        </form>
      ))}

      <hr />
      <h3>Add a URL</h3>
      <form onSubmit={submit}>
        <input type="hidden" name="originalId" value="" />

        <label>
          URL <input type="url" name="id" value="" />
        </label>

        <label>
          Label <input type="text" name="label" value="" />
        </label>

        <p>
          <button type="submit">Save</button>
        </p>
      </form>
    </>
  );
};
