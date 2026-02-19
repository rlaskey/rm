import { useState } from "preact/hooks";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborRequestInit } from "../../src/cbor-encode.ts";

import { aFile } from "../src/data.ts";
import { Status, statusState } from "../src/status.tsx";
import { useFile } from "../src/use-file.ts";
import { DisplayFile } from "../src/files.tsx";

export const WriteFile = () => {
  const { file, setFile } = useFile();
  if (!file.id) return;

  const [status, setStatus] = useState(statusState());

  const submit = (event: Event) => {
    event.preventDefault();
    setStatus(statusState(""));
    const form = event.currentTarget as HTMLFormElement;

    const payload = new Map<string, typeof aFile.valueType>();
    aFile.schema.forEach((c) => {
      const element = form.elements.namedItem(c.name) as
        | HTMLFormElement
        | null;
      if (!element) return;

      const n = c.browserToNetwork(element.value) as string | null;
      if (n === file[c.name]) return;

      payload.set(c.name, n);
    });

    if (!payload.size) {
      return setStatus(statusState("Nothing to save.", "warning"));
    }

    fetch(
      "/3/file/" + String(BigInt(file.id as number | bigint)),
      cborRequestInit(payload),
    ).then(async (res) => {
      if (!res.ok) throw new Error(await res.text() || "Save failed.");
      setFile(
        aFile.networkToState(cborDecode(await res.bytes())) as Record<
          string,
          typeof aFile.valueType
        >,
      );
      setStatus(statusState("Saved."));
    }).catch((e: Error) => {
      setStatus(statusState(String(e.message || e), "error"));
    });
  };

  return (
    <>
      <DisplayFile {...file} />
      <form onSubmit={submit}>
        <label>
          Title
          <input
            type="text"
            name="title"
            value={file.title as string}
          />
        </label>

        <Status {...status} />
        <p>
          <button type="submit">Save</button>
        </p>
      </form>
    </>
  );
};
