import { useState } from "preact/hooks";

import { UPLOAD_BYTES_LIMIT } from "../../src/site.ts";
import { Status, statusState } from "../../src/status.tsx";

export const Upload = () => {
  const [status, setStatus] = useState(statusState());

  const upload = async () => {
    const input = document.getElementById("upload") as HTMLInputElement;

    const files = input.files as FileList;
    input.value = "";

    const success: string[] = [];
    const errors: string[] = [];
    let response: Response | undefined;
    for (const file of files) {
      if (file.size > UPLOAD_BYTES_LIMIT) {
        errors.push(file.name + " exceeds the file size upload limit.");
        continue;
      }

      response = await fetch("/3/file", { method: "POST", body: file });
      if (!response.ok) {
        errors.push(file.name + ": " + await response.text());
      } else success.push(file.name);
    }

    const message: string[] = [];
    if (success.length) {
      message.push("Uploaded: " + success.join("; "));
      message.push("Reload page to see results.");
    }
    if (errors.length) message.push("Failures: " + errors.join("; "));
    setStatus(statusState(
      message.join(". "),
      errors.length ? "error" : "info",
    ));
  };

  return (
    <>
      <Status {...status} />

      <p>
        <input id="upload" type="file" multiple />
        <button type="button" onClick={upload}>Upload</button>
      </p>
    </>
  );
};
