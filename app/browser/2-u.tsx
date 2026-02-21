import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { signal } from "@preact/signals";

import { cborRequestInit } from "../src/cbor-encode.ts";
import { cborDecode } from "../src/cbor-decode.ts";

import { Status, statusState } from "./src/status.tsx";
import { UserName } from "./src/user.tsx";

const me = signal({ name: "", write: false });
const passkeys = signal<string[]>([]);

const Passkeys = () => {
  const [error, setError] = useState("");

  const createPasskey = () => {
    setError("");
    fetch("/1/credentials/create/0", { method: "POST" })
      .then(async (res0) => await res0.json())
      .then((options) =>
        navigator.credentials.create({
          publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
        })
      ).then((credential) => {
        if (!credential) throw new Error("Empty Credential.");
        return (credential as PublicKeyCredential).toJSON();
      }).then((j: PublicKeyCredentialJSON) =>
        fetch("/1/credentials/create/1", {
          method: "POST",
          body: JSON.stringify(j),
        })
      ).then(async (res1) => {
        if (!res1.ok) throw new Error(await res1.text());
        passkeys.value = [
          ...passkeys.value,
          cborDecode(await res1.bytes()) as string,
        ];
      }).catch((e: Error) => {
        const message = (e instanceof Error) ? e.message : e;
        setError(String(message));
      });
  };

  return (
    <>
      <h2>Passkeys</h2>

      {passkeys.value.map((p) => <pre key={p}>{p}</pre>)}
      {error && <p className="error">{error}</p>}

      <p>
        <button type="button" onClick={createPasskey}>
          Create New Passkey
        </button>
      </p>
    </>
  );
};

const User = () => {
  const [status, setStatus] = useState(statusState());

  useEffect(() => {
    fetch("/2/me").then(async (res) => {
      const d = cborDecode(await res.bytes()) as Map<
        string,
        string | boolean | string[]
      >;
      me.value = {
        name: d.get("name") as string,
        write: d.get("write") as boolean,
      };
      passkeys.value = d.get("passkeys") as string[];
    });
  }, []);

  const updateName = (event: Event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;

    if (me.value.name === name) {
      setStatus(statusState("Nothing to save.", "warning"));
      return;
    }

    fetch("/2/me", cborRequestInit({ name })).then(async (res) => {
      if (!res.ok) throw new Error(await res.text() || "Save failed.");

      const d = cborDecode(await res.bytes()) as Map<string, string>;
      me.value = { ...me.value, name: d.get("name") as string };
      setStatus(statusState("Saved."));
    }).catch((error: Error) =>
      setStatus(statusState(String(error.message || error), "error"))
    );
  };

  if (!me.value) return;

  return (
    <>
      <header>
        <nav>
          <menu className="inline">
            <li>😁</li>
            <li>
              <a href="/r">Read</a>.
            </li>
            {me.value.write && (
              <li>
                <a href="/w">Write</a>.
              </li>
            )}
            <li>
              <a href="/logout">Logout</a>.
            </li>
          </menu>
        </nav>
      </header>
      <main>
        <h2>Account: {me.value.name}</h2>

        <form onSubmit={updateName}>
          <UserName />
          <input name="name" required value={me.value.name} />

          <Status {...status} />
          <p>
            <button type="submit">Save</button>
          </p>
        </form>

        <hr />

        <Passkeys />
      </main>
    </>
  );
};

addEventListener("DOMContentLoaded", () => render(<User />, document.body));
