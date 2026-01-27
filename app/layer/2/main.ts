import { compose, Middleware } from "../../src/framework.ts";

import { claim } from "./claim.ts";
import { index } from "./index.tsx";
import { meGET, mePOST } from "./me.ts";

import { layer3 } from "../3/main.ts";

const block: Middleware = async (ctx, next) => {
  if (ctx.state.session?.user_id) await next();
};

const router: Middleware = async (ctx, next) => {
  if (ctx.req.method === "GET") {
    if (ctx.url.pathname === "/u/claim") return await claim(ctx, next);

    if (ctx.url.pathname === "/u") return await index(ctx, next);
    if (ctx.url.pathname === "/u/me") return await meGET(ctx, next);
  } else if (ctx.req.method === "POST") {
    if (ctx.url.pathname === "/u/me") return await mePOST(ctx, next);
  }

  await next();
};

export const layer2: Middleware = async (ctx, _) => {
  await compose([block, router, layer3])(ctx);
};
