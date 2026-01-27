import { serveDir } from "@std/http/file-server";

import { compose, Middleware } from "../../src/framework.ts";

import { bots } from "./00-bots.ts";
import { csp } from "./01-csp.ts";
import { csrf } from "./02-csrf.ts";

import { layer1 } from "../1/main.ts";

const serveDirStatic: Middleware = async (ctx, next) => {
  const response = await serveDir(ctx.req, {
    fsRoot: "static",
    quiet: true,
    headers: ["Cache-Control: max-age=262144"],
  });
  if (response.status >= 400) {
    await next();
    return;
  }

  ctx.res = response;
};

const serveDirDist: Middleware = async (ctx, next) => {
  const response = await serveDir(ctx.req, {
    fsRoot: "dist",
    quiet: true,
    headers: ["Cache-Control: max-age=3600"],
  });
  if (response.status >= 400) {
    await next();
    return;
  }

  ctx.res = response;
};

export const layer0: Middleware = async (ctx, _) => {
  await compose([
    bots,
    serveDirStatic,
    serveDirDist,
    csp,
    csrf,
    layer1,
  ])(ctx);
};
