import { HttpError } from "fresh";

import { authenticatedDefine } from "@/src/define.ts";
import { getSite, setSite } from "@/src/site.ts";
import { getUser, setUser } from "@/src/user.ts";

export const handler = authenticatedDefine.handlers({
  async GET({ state }) {
    const site = await getSite();

    // TODO: MAYBE: look for the User associated with each.
    // If any User is not found, remove them.
    if (site.admins.size !== 0) throw new HttpError(400);

    const user = await getUser(state.session.userId);
    if (!user) throw new HttpError(400);
    user.write = true;
    if (!(await setUser(user)).ok) throw new HttpError(400);

    state.session.write = true;
    state.session.save = true;

    site.admins.add(state.session.userId);
    await setSite(site);

    return new Response(null, {
      status: 307,
      headers: { Location: "/e" },
    });
  },
});
