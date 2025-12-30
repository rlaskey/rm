import { define, SITE_NAME } from "@/src/define.ts";

export default define.page(({ Component }) => (
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{SITE_NAME}</title>
    </head>
    <body>
      <Component />
    </body>
  </html>
));
