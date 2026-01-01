import { authenticatedDefine } from "@/src/define.ts";

export default authenticatedDefine.middleware(async (ctx) => {
  if (!ctx.state.session.write) {
    return new Response(null, {
      status: 307,
      headers: { Location: "/" },
    });
  }

  return await ctx.next();
});
