import { compose, Middleware } from "../../src/framework.ts";

import { index } from "./index.tsx";

const block: Middleware = async (ctx, next) => {
  if (ctx.state.user?.get("write")) await next();
};

const router: Middleware = async (ctx, next) => {
  if (ctx.req.method === "GET") {
    if (ctx.url.pathname === "/e") return await index(ctx, next);
  } else if (ctx.req.method === "POST") {
    //
  }

  await next();
};

export const layer3: Middleware = async (ctx, _) => {
  await compose([block, router])(ctx);
};
