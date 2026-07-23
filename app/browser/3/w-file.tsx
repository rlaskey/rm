import { useState } from "preact/hooks";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborRequestInit } from "../../src/cbor-encode.ts";

import {
  dbFile,
  formElementsToZodObject,
  mapToZodObject,
} from "../src/data.ts";
import { Status, statusState } from "../src/status.tsx";
import { useFile } from "../src/use-file.ts";
import { DisplayFile } from "../src/files.tsx";
import { UploadFile } from "./w-file/upload-file.tsx";
import { SupportedMapsCBOR } from "../../src/cbor.ts";

export const WriteFile = () => {
  const { file, setFile } = useFile();
  if (!file?.id) return;

  const [status, setStatus] = useState(statusState());

  const submit = (event: Event) => {
    event.preventDefault();
    setStatus(statusState(""));
    const form = event.currentTarget as HTMLFormElement;

    const sprI = formElementsToZodObject(
      form.elements,
      dbFile.pick({ title: true }),
    );
    if (!sprI.success) return setStatus(statusState(sprI.error.message));

    fetch(
      "/3/file/meta/" + String(BigInt(file.id as number | bigint)),
      cborRequestInit(sprI.data),
    ).then(async (res) => {
      if (!res.ok) throw new Error(await res.text() || "Save failed.");
      const spr = mapToZodObject(
        cborDecode(await res.bytes()) as SupportedMapsCBOR,
        dbFile,
      );
      if (!spr.success) throw new Error(spr.error.message);
      setFile(spr.data);
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

      <hr />

      <UploadFile id={file.id as bigint} />
    </>
  );
};
