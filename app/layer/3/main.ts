import { compose, Middleware } from "../../src/framework.ts";

import { w } from "./w.tsx";
import { getArticle, insertArticle, updateArticle } from "./article.ts";

const block: Middleware = async (ctx, next) => {
  if (ctx.state.user?.get("write")) await next();
};

const router: Middleware = async (ctx, next) => {
  if (ctx.req.method === "GET") {
    if (ctx.url.pathname.startsWith("/w")) return await w(ctx, next);
    if (ctx.url.pathname.startsWith("/3/article/")) {
      return await getArticle(ctx, next);
    }
  } else if (ctx.req.method === "POST") {
    if (ctx.url.pathname.startsWith("/3/article/")) {
      return await updateArticle(ctx, next);
    }
    if (ctx.url.pathname === "/3/article") {
      return await insertArticle(ctx, next);
    }
  }

  await next();
};

export const layer3: Middleware = async (ctx, _) => {
  await compose([block, router])(ctx);
};
