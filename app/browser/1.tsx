import { render } from "preact";
import { useState } from "preact/hooks";

// NOTE: we will use this for other routes. Doing this here allows the bundler to process it.
import "./src/0.css";
import { UserName } from "./src/user.tsx";

const Layer1 = () => {
  const [attempted, setAttempted] = useState(false);
  const [getError, setGetError] = useState("");
  const [createError, setCreateError] = useState("");

  const yay = () => globalThis.location.replace("/r");

  const get = async () => {
    navigator.credentials.get({
      publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(
        await (await fetch("/1/credentials/get/0")).json(),
      ),
    }).then((res0: Credential | null) =>
      fetch("/1/credentials/get/1", {
        method: "POST",
        body: JSON.stringify(res0),
      })
    ).then(async (res1) => {
      if (res1.ok) yay();
      else throw new Error(await res1.text());
    }).catch((e: Error) => setGetError(String(e.message || e)))
      .finally(() => setAttempted(true));
  };

  const create = (event: Event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const name: string =
      (form.elements.namedItem("name") as HTMLInputElement).value;

    fetch("/1/credentials/create/0", {
      method: "POST",
      body: JSON.stringify({ name }),
    }).then(async (res0) => await res0.json())
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
        if (res1.ok) yay();
        else throw new Error(await res1.text());
      }).catch((e: Error) => setCreateError(String(e.message || e)))
      .finally(() => setAttempted(true));
  };

  return (
    <>
      <header>
        <nav>
          <menu className="inline">
            <li aria-hidden="true">👋</li>
            {attempted &&
              (
                <li>
                  <a href="/logout">Logout</a>.
                </li>
              )}
          </menu>
        </nav>
      </header>

      <h2>?!</h2>

      <p>
        <a href="https://en.wikipedia.org/wiki/WebAuthn">Passkeys</a>{" "}
        are good for you. If you've never set one up, now is a great time to
        start.
      </p>

      <hr />

      <h2>Authenticate</h2>

      <p>
        For when you've been here before AND if you've successfully Registered.
      </p>
      <p>
        <button type="button" onClick={get}>
          Authenticate
        </button>
      </p>

      {getError && <p className="error">{getError}</p>}

      <hr />

      <h2>Register</h2>
      <p>
        For when you've NOT been here before OR if Authenticating isn't working
        out. This will create a NEW Passkey.
      </p>
      <form onSubmit={create}>
        <label>
          <UserName />
          <input name="name" value="LARRY" required />
        </label>
        <p>
          <button type="submit">
            Register
          </button>
        </p>
      </form>

      {createError && <p className="error">{createError}</p>}
    </>
  );
};

addEventListener("DOMContentLoaded", () => render(<Layer1 />, document.body));
