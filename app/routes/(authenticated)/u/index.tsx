import { HttpError } from "fresh";

import { db } from "@/src/sqlite.ts";

import { authenticatedDefine } from "@/src/define.ts";

const passkeys = (userId: number | bigint) =>
  db.prepare("SELECT id FROM passkey WHERE user_id = ?").all(userId).map((p) =>
    p.id
  );

export const handler = authenticatedDefine.handlers({
  GET({ state }) {
    return { data: { user: state.user, passkeys: passkeys(state.user.id) } };
  },

  async POST({ state, req }) {
    const newName = (await req.formData()).get("name");
    if (typeof newName !== "string" || !newName) throw new HttpError(400);

    if (
      db.prepare("UPDATE user SET name = ? WHERE id = ?").run(
        newName,
        state.user.id,
      ).changes !== 1
    ) throw new HttpError(500);
    state.user.name = newName;

    return { data: { user: state.user, passkeys: passkeys(state.user.id) } };
  },
});

export default authenticatedDefine.page<typeof handler>(({ data }) => {
  return (
    <>
      <h2>Account: {data.user.name}</h2>

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
          value={data.user.name}
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
