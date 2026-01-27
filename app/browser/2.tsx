import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

import { cborRequestInit } from "../src/cbor-encode.ts";
import { cborDecode } from "../src/cbor-decode.ts";

const Layer2 = () => {
  const [name, setName] = useState("");
  const [write, setWrite] = useState(false);
  const [passkeys, setPasskeys] = useState<string[]>([]);

  useEffect(() => {
    fetch("/u/me").then(async (res) => {
      const d = cborDecode(await res.bytes()) as Map<
        string,
        string | boolean | string[]
      >;
      setName(d.get("name") as string);
      setWrite(d.get("write") as boolean);
      setPasskeys(d.get("passkeys") as string[]);
    });
  }, []);

  const updateName = (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    fetch("/u/me", cborRequestInit({ name })).then(async (res) => {
      const d = cborDecode(await res.bytes()) as Map<string, string>;
      setName(d.get("name") as string);
    });
  };

  if (!name) return;

  return (
    <>
      <h1>👋🏷️</h1>
      <h2>Account: {name}</h2>

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
          value={name}
        />
        <button type="submit">Save</button>
      </form>

      <h2>Passkeys</h2>

      <p class="info">
        NOTE: at some point we will be able to do things, such as removing all
        but the last one, and then adding a NEW Passkey.
      </p>

      {passkeys.map((p) => <pre key={p}>{p}</pre>)}

      <nav>
        <menu>
          {write && (
            <li>
              <a href="/e">Edit</a>.
            </li>
          )}{" "}
          <li>
            <a href="/logout">Logout</a>.
          </li>
        </menu>
      </nav>
    </>
  );
};

addEventListener("DOMContentLoaded", () => render(<Layer2 />, document.body));
