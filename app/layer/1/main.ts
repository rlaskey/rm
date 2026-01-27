import { compose, Middleware } from "../../src/framework.ts";

import { session } from "./00-session.ts";

import { index } from "./index.tsx";
import { logout } from "./logout.ts";

import { get0 } from "./credentials/get/0.ts";
import { get1 } from "./credentials/get/1.ts";

import { create0 } from "./credentials/create/0.ts";
import { create1 } from "./credentials/create/1.ts";

import { layer2 } from "../2/main.ts";

const router: Middleware = async (ctx, next) => {
  if (ctx.req.method === "GET") {
    if (ctx.url.pathname === "/") return await index(ctx, next);
    if (ctx.url.pathname === "/logout") return await logout(ctx, next);
    if (ctx.url.pathname === "/credentials/get/0") return await get0(ctx, next);
  } else if (ctx.req.method === "POST") {
    if (ctx.url.pathname === "/credentials/get/1") return await get1(ctx, next);

    if (ctx.url.pathname === "/credentials/create/0") {
      return await create0(ctx, next);
    }
    if (ctx.url.pathname === "/credentials/create/1") {
      return await create1(ctx, next);
    }
  }

  await next();
};

export const layer1: Middleware = async (ctx, _) => {
  await compose([session, router, layer2])(ctx);
};
