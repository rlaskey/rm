import { define } from "@/src/define.ts";

export default define.middleware(async (ctx) => {
  if (!ctx.state.session?.user_id) return ctx.redirect("/");
  return await ctx.next();
});
