import { define } from "@/src/define.ts";

export default define.middleware(async (ctx) => {
  if (!ctx.state.session?.user_id) {
    return new Response(null, {
      status: 307,
      headers: { Location: "/" },
    });
  }

  return await ctx.next();
});
