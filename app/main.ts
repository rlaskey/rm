import { Context } from "./src/framework.ts";
import { db } from "./src/sqlite.ts";

import { layer0 } from "./layer/0/main.ts";
import { UPLOAD_BYTES_LIMIT } from "./browser/src/site.ts";

const handler = async (req: Request): Promise<Response> => {
  const ctx = new Context(req);

  if (
    parseInt(req.headers.get("content-length") || "0") <= UPLOAD_BYTES_LIMIT
  ) {
    await layer0(ctx, async () => {});
  }

  if (req.body && !req.bodyUsed) {
    for await (const _ of req.body || []) {
      // Do nothing. Drain the connection.
      // This SHOULD be even lighter than `await req.blob()`:
      // it's streaming + not accumulating.
    }
  }

  return ctx.res;
};

const server = Bun.serve({ fetch: handler });

const shutdown = () => {
  db.close();
  server.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
