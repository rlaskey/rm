import { define } from "@/src/define.ts";
import { getSession, setSession } from "@/src/session.ts";

export const session = define.middleware(async (ctx) => {
  ctx.state.session = await getSession(ctx.req.headers);
  const response = await ctx.next();

  await setSession(response, ctx.state.session);
  return response;
});
