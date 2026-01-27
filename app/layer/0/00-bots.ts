import { Middleware } from "../../src/framework.ts";

const BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",

  "Googlebot",
  "Google-CloudVertexBot",
  "Google-Extended",

  "Bingbot",

  "Slurp",

  "Baiduspider",

  "YandexBot",

  "Facebot",
  "facebookexternalhit",

  "CCBot",

  "anthropic-ai",
  "ClaudeBot",
  "claude-web",

  "Perplexity",
];

export const bots: Middleware = async (ctx, next) => {
  const ua: string = ctx.req.headers.get("user-agent") || "";
  if (BOTS.some((i) => ua.includes(i))) {
    ctx.res = new Response(null, { status: 404 });
  } else await next();
};
