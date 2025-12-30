import { define } from "@/src/define.ts";

import { destroySession } from "@/src/session.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const response = new Response(null, {
      status: 307,
      headers: { Location: "/" },
    });
    await destroySession(response, ctx.state.sessionKV);
    ctx.state.sessionKV = null;
    return response;
  },
});
