import { IS_BROWSER } from "fresh/runtime";

export default function CredentialsCreate() {
  if (!IS_BROWSER) return;

  const create = async (event: Event): Promise<void> => {
    try {
      event.preventDefault();

      const form = event.currentTarget as HTMLFormElement;
      const name: string =
        (form.elements.namedItem("name") as HTMLInputElement).value;

      const options: PublicKeyCredentialCreationOptionsJSON =
        await (await fetch("/credentials-create/0", {
          method: "POST",
          body: JSON.stringify({ name }),
        })).json();
      const raw = (await navigator.credentials.create({
        publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
      }) as PublicKeyCredential).toJSON() as PublicKeyCredentialJSON;

      await fetch("/credentials-create/1", {
        method: "POST",
        body: JSON.stringify(raw),
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
      <h2>Register</h2>
      <p>
        If you think you have your Passkey stored elsewhere, you can try
        Authenticate again. Otherwise, you can Register, which will create a NEW
        Passkey.
      </p>
      <p>
        We're asking for a name, but that can be anything that helps you
        remember who you are / what you call yourself or your device, in this
        context.
      </p>
      <form class="flex" onSubmit={create}>
        <input
          name="name"
          class="grow mr-4"
          placeholder="Your Name"
          required
        />
        <button type="submit">
          Register
        </button>
      </form>
    </>
  );
}
