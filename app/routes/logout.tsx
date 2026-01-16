import { define } from "@/src/define.ts";

import { deleteSession } from "@/src/session.ts";

export const handler = define.handlers({
  GET({ state }) {
    const response = new Response(null, {
      status: 307,
      headers: { Location: "/" },
    });
    deleteSession(response, state.session);
    state.session = undefined;

    return response;
  },
});
