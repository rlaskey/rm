import { exists } from "@std/fs/exists";

const DIST = "dist";

if (await exists(DIST, { isDirectory: true })) {
  await Deno.remove(DIST, { recursive: true });
}
await Deno.mkdir(DIST);

await Deno.bundle({
  entrypoints: [
    "browser/1.tsx",
    "browser/2-r.tsx",
    "browser/2-u.tsx",
    "browser/3-w.tsx",
  ],
  outputDir: DIST,
  platform: "browser",
  minify: true,
  sourcemap: "linked",
  codeSplitting: true,
});

import { Context } from "./src/framework.ts";
import { db } from "./src/sqlite.ts";

import { layer0 } from "./layer/0/main.ts";
import { UPLOAD_BYTES_LIMIT } from "./browser/src/site.ts";

const handler: Deno.ServeHandler = async (req) => {
  const ctx = new Context(req);

  if (
    parseInt(req.headers.get("content-length") || "0") <= UPLOAD_BYTES_LIMIT
  ) await layer0(ctx, async () => {});

  if (req.body && !req.bodyUsed) {
    for await (const _ of req.body || []) {
      // Do nothing. Drain the connection.
      // This SHOULD be even lighter than `await req.blob()`:
      // it's streaming + not accumulating.
    }
  }

  return ctx.res;
};

const server = Deno.serve(handler);
server.finished.then(() => {
  db.close();
});
