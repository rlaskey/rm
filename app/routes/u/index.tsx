import { HttpError } from "fresh";

import { define, type State } from "@/src/define.ts";
import { getUserFromKV, storeUserKV } from "@/src/user.ts";

const hydrate = (state: State) => {
  const user = state.sessionKV?.value.userKV?.value;
  if (!user) throw new HttpError(400);
  return {
    data: { userName: user.name, passkeys: [...user.passkeys.values()] },
  };
};

export const handler = define.handlers({
  GET({ state }) {
    return hydrate(state);
  },

  async POST({ state, req }) {
    // NOTE: this is helping out Typescript. Should be otherwise caught by middleware.
    if (!state.sessionKV?.value.userKV) throw new HttpError(400);

    const newName = (await req.formData()).get("name");
    if (typeof newName !== "string" || !newName) throw new HttpError(400);

    const userFromSession = state.sessionKV?.value.userKV;
    if (!userFromSession) throw new HttpError(400);

    const newUser = await getUserFromKV(userFromSession.key);
    if (newUser === null) throw new HttpError(400);
    newUser.name = newName;
    const newUserKV = { key: userFromSession.key, value: newUser };

    if (!(await storeUserKV(newUserKV)).ok) throw new HttpError(500);
    state.sessionKV.value.userKV = newUserKV;

    return hydrate(state);
  },
});

export default define.page<typeof handler>(({ data }) => {
  return (
    <>
      <h2>Account: {data.userName}</h2>

      <p>
        You can call yourself whatever you want, and change the name at any
        point. There is no claiming of a username: everyone can be named Larry,
        if that's how things shake out.
      </p>

      <form class="flex" method="POST">
        <label for="i-name">
          Name:
        </label>
        <input
          class="flex-1"
          id="i-name"
          name="name"
          placeholder="Your Name"
          required
          title="Whatever you want to call yourself / this account."
          value={data.userName}
        />
        <button type="submit">
          Save
        </button>
      </form>

      <h2>Passkeys</h2>

      <p class="info">
        NOTE: at some point we will be able to do things, such as removing all
        but the last one, and then adding a NEW Passkey.
      </p>

      {data.passkeys.map((p) => <pre key={p}>{p}</pre>)}
    </>
  );
});
