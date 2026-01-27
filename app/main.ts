import { exists } from "@std/fs/exists";

const DIST = "dist";

if (await exists(DIST, { isDirectory: true })) {
  await Deno.remove(DIST, { recursive: true });
}
await Deno.mkdir(DIST);

await Deno.bundle({
  entrypoints: ["browser/1.tsx", "browser/2.tsx", "browser/3.tsx"],
  outputDir: DIST,
  platform: "browser",
  minify: true,
  sourcemap: "linked",
  codeSplitting: true,
});

import { Context } from "./src/framework.ts";
import { db } from "./src/sqlite.ts";

import { layer0 } from "./layer/0/main.ts";

const handler: Deno.ServeHandler = async (req) => {
  const ctx = new Context(req);
  await layer0(ctx, async () => {});
  return ctx.res;
};

const server = Deno.serve(handler);
server.finished.then(() => {
  db.close();
});
