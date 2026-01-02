import { HttpError } from "fresh";

import { authenticatedDefine } from "@/src/define.ts";
import { getUser, setUser } from "@/src/user.ts";

export const handler = authenticatedDefine.handlers({
  async GET({ state }) {
    const user = await getUser(state.session.userId);
    if (!user) throw new HttpError(400);
    return { data: user };
  },

  async POST({ state, req }) {
    const newName = (await req.formData()).get("name");
    if (typeof newName !== "string" || !newName) throw new HttpError(400);

    const user = await getUser(state.session.userId);
    if (!user) throw new HttpError(400);
    user.name = newName;
    if (!(await setUser(user)).ok) throw new HttpError(500);

    return { data: user };
  },
});

export default authenticatedDefine.page<typeof handler>(({ data }) => {
  return (
    <>
      <h2>Account: {data.name}</h2>

      <form method="POST">
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
          value={data.name}
        />
        <button type="submit">Save</button>
      </form>

      <h2>Passkeys</h2>

      <p class="info">
        NOTE: at some point we will be able to do things, such as removing all
        but the last one, and then adding a NEW Passkey.
      </p>

      {[...data.passkeys.values()].map((p) => <pre key={p}>{p}</pre>)}
    </>
  );
});
