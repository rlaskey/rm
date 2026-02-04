import { compose, Middleware } from "../../src/framework.ts";

import { getArticle } from "./article.ts";
import { claim } from "./claim.ts";
import { articleDrafts, articlePublished, references } from "./index.ts";
import { meGET, mePOST } from "./me.ts";
import { r } from "./r.tsx";
import { getReference, getURLs } from "./reference.ts";
import { u } from "./u.tsx";

import { layer3 } from "../3/main.ts";

const block: Middleware = async (ctx, next) => {
  if (ctx.state.session?.user_id) {
    await next();
    return;
  }

  ctx.res = new Response(null, {
    status: 302,
    headers: { "Location": "/login" },
  });
};

const router: Middleware = async (ctx, next) => {
  if (ctx.req.method === "GET") {
    if (ctx.url.pathname.startsWith("/u")) return await u(ctx, next);
    if (ctx.url.pathname.startsWith("/r")) return await r(ctx, next);
    if (ctx.url.pathname === "/") {
      ctx.res = new Response(null, {
        status: 302,
        headers: { "Location": "/u" },
      });
      return;
    }

    if (ctx.url.pathname === "/2/articles/drafts") {
      return await articleDrafts(ctx, next);
    }
    if (ctx.url.pathname === "/2/articles/published") {
      return await articlePublished(ctx, next);
    }
    if (ctx.url.pathname === "/2/references") {
      return await references(ctx, next);
    }

    if (ctx.url.pathname.startsWith("/2/article/")) {
      return await getArticle(ctx, next);
    }

    if (ctx.url.pathname.startsWith("/2/reference/")) {
      return await getReference(ctx, next);
    }
    if (ctx.url.pathname.startsWith("/2/urls/")) {
      return await getURLs(ctx, next);
    }

    if (ctx.url.pathname === "/2/me") return await meGET(ctx, next);
    if (ctx.url.pathname === "/2/claim") return await claim(ctx, next);
  } else if (ctx.req.method === "POST") {
    if (ctx.url.pathname === "/2/me") return await mePOST(ctx, next);
  }

  await next();
};

export const layer2: Middleware = async (ctx, _) => {
  await compose([block, router, layer3])(ctx);
};
