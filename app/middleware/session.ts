import { define } from "@/src/define.ts";
import { setSession } from "@/src/session.ts";
import { getState } from "@/src/state.ts";

export const session = define.middleware(async (ctx) => {
  Object.assign(ctx.state, getState(ctx.req.headers));
  const start = JSON.stringify(ctx.state.session);

  const response = await ctx.next();

  setSession(response, ctx.state.session, start);
  return response;
});
