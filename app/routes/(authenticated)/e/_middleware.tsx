import { authenticatedDefine } from "@/src/define.ts";

export default authenticatedDefine.middleware(async (ctx) => {
  if (!ctx.state.user.get("write")) return ctx.redirect("/");
  return await ctx.next();
});
