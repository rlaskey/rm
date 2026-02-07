import { useState } from "preact/hooks";

import { cborDecode } from "../../../src/cbor-decode.ts";
import { cborRequestInit } from "../../../src/cbor-encode.ts";
import { SupportedArraysCBOR } from "../../../src/cbor.ts";

import { aLabeledURL } from "../../src/data.ts";
import { Status, statusState } from "../../src/status.tsx";

export const LabeledURLs = (
  props: {
    referenceId: string;
    labeledURLs: Record<string, typeof aLabeledURL.valueType>[];
    setLabeledURLs: (
      value: Record<string, typeof aLabeledURL.valueType>[],
    ) => void;
  },
) => {
  const [status, setStatus] = useState(statusState());

  const submit = (event: Event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;

    const payload = new Map<string, typeof aLabeledURL.valueType>([
      ["reference_id", BigInt(props.referenceId)],
      [
        "originalId",
        (form.elements.namedItem("originalId") as HTMLFormElement).value,
      ],
    ]);
    aLabeledURL.schema.forEach((c) => {
      const element = form.elements.namedItem(c.name) as HTMLFormElement | null;
      if (!element) return;
      const n = c.browserToNetwork(element.value);
      if (n) payload.set(c.name, n);
    });

    fetch("/3/url", cborRequestInit(payload)).then(async (res) => {
      if (!res.ok) throw new Error(await res.text() || "Save failed.");
      props.setLabeledURLs(
        (cborDecode(await res.bytes()) as SupportedArraysCBOR).map((x) =>
          aLabeledURL.networkToState(x) as Record<
            string,
            typeof aLabeledURL.valueType
          >
        ),
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
          <input type="hidden" name="originalId" value={u.id as string} />

          <label>
            URL <input type="url" name="id" value={u.id as string} />
          </label>

          <label>
            Label <input type="text" name="label" value={u.label as string} />
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
