import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { signal } from "@preact/signals";

import { cborRequestInit } from "../src/cbor-encode.ts";
import { cborDecode } from "../src/cbor-decode.ts";

import { dateToLocal } from "./data.ts";

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
      {error && <p class="error">{error}</p>}

      <p>
        <button type="button" onClick={createPasskey}>
          Create New Passkey
        </button>
      </p>
    </>
  );
};

const User = () => {
  const [status, setStatus] = useState({ m: "", c: "", d: new Date() });

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
      setStatus({ m: "Nothing to save.", c: "warning", d: new Date() });
      return;
    }

    fetch("/2/me", cborRequestInit({ name })).then(async (res) => {
      if (!res.ok) throw new Error(await res.text() || "Save failed.");

      const d = cborDecode(await res.bytes()) as Map<string, string>;
      me.value = { ...me.value, name: d.get("name") as string };
      setStatus({ m: "Saved.", c: "info", d: new Date() });
    }).catch((error: Error) =>
      setStatus({
        m: String(error.message || error),
        c: "error",
        d: new Date(),
      })
    );
  };

  if (!me.value) return;

  return (
    <>
      <header>
        <nav>
          <menu class="inline">
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
          <details>
            <summary>Name</summary>
            You can call yourself whatever you want, and change the name at any
            point. There is no claiming of a username: everyone can be named
            Larry, if that's how things shake out.
          </details>
          <input
            name="name"
            placeholder="Your Name"
            required
            title="Whatever you want to call yourself / this account."
            value={me.value.name}
          />

          {status.m && (
            <p class={status.c}>{dateToLocal(status.d)} -- {status.m}</p>
          )}

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
