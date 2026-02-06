import { compose, Middleware } from "../../src/framework.ts";

import { insertArticle, updateArticle } from "./article.ts";
import {
  articleReference,
  articleReferenceDelete,
  referencePair,
  referencePairDelete,
} from "./links.ts";
import { insertReference, updateReference } from "./reference.ts";
import { postURL } from "./url.ts";
import { w } from "./w.tsx";

const block: Middleware = async (ctx, next) => {
  if (ctx.state.user?.get("write")) await next();
};

const router: Middleware = async (ctx, next) => {
  if (ctx.req.method === "GET") {
    if (ctx.url.pathname.startsWith("/w")) return await w(ctx, next);
  } else if (ctx.req.method === "POST") {
    if (ctx.url.pathname.startsWith("/3/article/")) {
      return await updateArticle(ctx, next);
    }
    if (ctx.url.pathname.startsWith("/3/reference/")) {
      return await updateReference(ctx, next);
    }

    if (ctx.url.pathname === "/3/article") {
      return await insertArticle(ctx, next);
    }
    if (ctx.url.pathname === "/3/reference") {
      return await insertReference(ctx, next);
    }
    if (ctx.url.pathname === "/3/url") {
      return await postURL(ctx, next);
    }

    if (ctx.url.pathname == "/3/articleReference") {
      return articleReference(ctx, next);
    }
    if (ctx.url.pathname == "/3/referencePair") {
      return referencePair(ctx, next);
    }
  } else if (ctx.req.method === "DELETE") {
    if (ctx.url.pathname == "/3/articleReference") {
      return articleReferenceDelete(ctx, next);
    }
    if (ctx.url.pathname == "/3/referencePair") {
      return referencePairDelete(ctx, next);
    }
  }

  await next();
};

export const layer3: Middleware = async (ctx, _) => {
  await compose([block, router])(ctx);
};
