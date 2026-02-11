import { renderToString } from "preact-render-to-string";

import { type Middleware } from "../../src/framework.ts";

import { SITE_NAME } from "../../src/env.ts";

import { App } from "../app.tsx";

export const login: Middleware = (ctx, _) => {
  if (ctx.state.session?.user_id) {
    ctx.res = new Response(null, {
      status: 302,
      headers: { "Location": "/u" },
    });
    return;
  }

  ctx.res = new Response(
    "<!DOCTYPE html>" +
      renderToString(
        <App title={SITE_NAME} scripts={["/1.js"]} css={["/1.css"]} />,
      ),
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
};
