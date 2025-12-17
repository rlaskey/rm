import { HttpError } from "fresh";
import { define } from "@/utils.ts";

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

export const bots = define.middleware((ctx) => {
  const ua: string = ctx.req.headers.get("user-agent") || "";
  if (BOTS.some((i) => ua.includes(i))) {
    throw new HttpError(403);
  }

  return ctx.next();
});
