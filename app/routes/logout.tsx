import { define } from "@/src/define.ts";

import { deleteSession } from "@/src/session.ts";

export const handler = define.handlers({
  async GET({ state }) {
    const response = new Response(null, {
      status: 307,
      headers: { Location: "/" },
    });
    await deleteSession(response, state.session);
    state.session = null;
    return response;
  },
});
