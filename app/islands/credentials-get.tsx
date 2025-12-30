import { IS_BROWSER } from "fresh/runtime";

export default function CredentialsGet() {
  if (!IS_BROWSER) return;

  const get = async (): Promise<void> => {
    try {
      const json0 = (await navigator.credentials.get({
        publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(
          await (await fetch("/credentials-get/0")).json(),
        ),
      }) as PublicKeyCredential).toJSON() as PublicKeyCredentialJSON;

      await fetch("/credentials-get/1", {
        method: "POST",
        body: JSON.stringify(json0),
      });
    } catch (e) {
      if (e instanceof Error) console.info(e.message);
      else console.log(e); // Not sure what this would be.
    } finally {
      globalThis.location.reload();
    }
  };

  return (
    <>
      <h2>Authenticate</h2>

      <p>
        This site uses{" "}
        <a href="https://en.wikipedia.org/wiki/WebAuthn">Passkeys</a>. We'll
        start with a search for existing credentials. If we can't find any, we
        can then create a new one.
      </p>
      <p>
        <button class="w-full" type="button" onClick={get}>
          Authenticate
        </button>
      </p>
    </>
  );
}
