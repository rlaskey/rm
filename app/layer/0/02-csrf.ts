import { Middleware } from "../../src/framework.ts";

const ALLOWED_METHODS = ["GET", "HEAD", "OPTIONS"];
const ALLOWED_SEC_FETCH_SITE = ["same-origin", "none"];

const block = (req: Request): boolean => {
  if (ALLOWED_METHODS.includes(req.method)) return false;
  if (
    ALLOWED_SEC_FETCH_SITE.includes(req.headers.get("sec-fetch-site") || "")
  ) return false;
  return true;
};

export const csrf: Middleware = async (ctx, next) => {
  if (block(ctx.req)) {
    ctx.res = new Response(null, { status: 403 });
  } else await next();
};
