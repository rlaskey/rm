import { signal } from "@preact/signals";

import { useEffect, useState } from "preact/hooks";

import { cborRequestInit } from "../../src/cbor-encode.ts";
import { cborDecode } from "../../src/cbor-decode.ts";

export const me = signal({ name: "", write: false });
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

export const U = () => {
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

  const updateName = (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    fetch("/2/me", cborRequestInit({ name })).then(async (res) => {
      const d = cborDecode(await res.bytes()) as Map<string, string>;
      me.value = { ...me.value, name: d.get("name") as string };
    });
  };

  if (!me.value) return;

  return (
    <>
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
        <button type="submit">Save</button>
      </form>

      <hr />

      <Passkeys />
    </>
  );
};
