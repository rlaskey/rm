import { useState } from "preact/hooks";

import { UPLOAD_BYTES_LIMIT } from "../../src/site.ts";
import { Status, statusState } from "../../src/status.tsx";

export const Upload = () => {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(statusState());

  const upload = async () => {
    setUploading(true);
    const input = document.getElementById("upload") as HTMLInputElement;
    const files = input.files as FileList;

    const success: string[] = [];
    const errors: string[] = [];

    let response: Response | undefined;
    for (const file of files) {
      if (file.size > UPLOAD_BYTES_LIMIT) {
        errors.push(file.name + " exceeds the file size upload limit.");
        continue;
      }

      try {
        response = await fetch("/3/file", { method: "POST", body: file });
        if (!response.ok) {
          errors.push(file.name + ": " + await response.text());
        } else success.push(file.name);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
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

    setUploading(false);
    input.value = "";
  };

  return (
    <>
      <Status {...status} />

      {uploading ? <p class="warning">🥳 uploading. Please hold.</p> : (
        <p>
          <input id="upload" type="file" multiple />
          <button type="button" onClick={upload}>Upload</button>
        </p>
      )}
    </>
  );
};
