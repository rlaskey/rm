import { define } from "@/src/define.ts";
import { getSession, saveSession } from "@/src/session.ts";

export const session = define.middleware(async (ctx) => {
  ctx.state.sessionKV = await getSession(ctx.req.headers);
  const response = await ctx.next();

  // NOTE: we save every time, to extend the lifetime.
  // We could do something else here instead.
  await saveSession(response, ctx.state.sessionKV);
  return response;
});
