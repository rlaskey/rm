import { compose, Middleware } from "../../src/framework.ts";
import { serveStatic } from "../../src/static.ts";

import { bots } from "./00-bots.ts";
import { csp } from "./01-csp.ts";
import { csrf } from "./02-csrf.ts";

import { layer1 } from "../1/main.ts";

export const layer0: Middleware = async (ctx, _) => {
  await compose([
    bots,
    serveStatic("static", 262_144),
    serveStatic("dist", 3_600),
    csp,
    csrf,
    layer1,
  ])(ctx);
};
