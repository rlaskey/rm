import { render } from "preact";
import { useState } from "preact/hooks";

// NOTE: we will use this for other routes. Doing this here allows the bundler to process it.
import "./src/0.css";

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
      }).catch((e: Error) => setCreateError(String(e.message || e)));
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
      <h2>Authenticate</h2>

      <p>
        This site uses{" "}
        <a href="https://en.wikipedia.org/wiki/WebAuthn">Passkeys</a>. We'll
        start with a search for existing credentials. If we can't find any, we
        can then create a new one.
      </p>
      <p>
        <button type="button" onClick={get}>
          Authenticate
        </button>
      </p>

      {getError && <p className="error">{getError}</p>}

      {attempted && (
        <>
          <h2>Register</h2>
          <p>
            If you think you have your Passkey stored elsewhere, you can try
            Authenticate again. Otherwise, you can Register, which will create a
            NEW Passkey.
          </p>
          <p>
            We're asking for a name, but that can be anything that helps you
            remember who you are / what you call yourself or your device, in
            this context.
          </p>
          <form onSubmit={create}>
            <label>
              Name
              <input
                className="flex-1"
                name="name"
                placeholder="Your Name"
                required
                title="Whatever you want to call yourself / this account."
              />
            </label>
            <p>
              <button type="submit">
                Register
              </button>
            </p>
          </form>

          {createError && <p className="error">{createError}</p>}
        </>
      )}
    </>
  );
};

addEventListener("DOMContentLoaded", () => render(<Layer1 />, document.body));
