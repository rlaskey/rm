import { type Middleware } from "../../src/framework.ts";

const RULES = [
  "default-src 'self'",
  "upgrade-insecure-requests",
];

export const csp: Middleware = async (ctx, next) => {
  await next();
  ctx.res.headers.set("Content-Security-Policy", RULES.join("; "));
};
