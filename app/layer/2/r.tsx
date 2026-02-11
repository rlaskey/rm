import { renderToString } from "preact-render-to-string";

import { type Middleware } from "../../src/framework.ts";

import { SITE_NAME } from "../../src/env.ts";

import { App } from "../app.tsx";

export const r: Middleware = (ctx, _) => {
  ctx.res = new Response(
    "<!DOCTYPE html>" +
      renderToString(
        <App title={SITE_NAME} scripts={["/2-r.js"]} css={["/1.css"]} />,
      ),
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
};
