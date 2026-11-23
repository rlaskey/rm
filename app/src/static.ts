import { realpathSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import { type Middleware } from "./framework.ts";

// max-age is a delta-seconds value: per RFC 9110 a non-negative integer
// capped at 2^31 - 1. The practical ceiling is one year — longer buys
// nothing, since URLs change — and 0 is valid (always revalidate).
const MAX_AGE_MIN = 0;
const MAX_AGE_MAX = 31_536_000; // one year, in seconds

const cacheControlFor = (maxAge: number): string => {
  if (typeof maxAge !== "number" || !Number.isInteger(maxAge)) {
    throw new TypeError(
      `serveStatic: maxAge must be an integer number of seconds, got ${String(maxAge)}`,
    );
  }
  if (maxAge < MAX_AGE_MIN || maxAge > MAX_AGE_MAX) {
    throw new RangeError(
      `serveStatic: maxAge ${maxAge} is outside [${MAX_AGE_MIN}, ${MAX_AGE_MAX}]; refusing to mount`,
    );
  }
  return `max-age=${maxAge}`;
};

// Resolve a request pathname to a real path inside `rootReal`, or null if
// the request should fall through. Modeled on @std/http's serveDir (decode
// first, reject encoded backslashes and dotfiles), plus a realpath so that
// symlinks inside the root cannot point outside it — serveDir relies on
// lexical containment only, which is one syscall cheaper per request but
// leaves that hole open.
const resolveWithinRoot = (
  rootReal: string,
  pathname: string,
): string | null => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // malformed percent-encoding
  }
  // A percent-encoded backslash survives URL parsing and is treated as a
  // path separator on Windows, bypassing POSIX-style checks.
  if (decoded.includes("\\")) return null;
  // Never serve dotfiles (.env, .git, ...), same as serveDir's default.
  if (/\/\./.test(decoded)) return null;
  let real: string;
  try {
    real = realpathSync(join(rootReal, decoded)); // join, not resolve: a leading "/" must not discard root
  } catch {
    return null; // ENOENT etc.
  }
  // Containment: compare canonical paths, with a separator boundary so
  // e.g. /srv/site-evil does not pass for root /srv/site.
  if (real !== rootReal && !real.startsWith(rootReal + sep)) return null;
  return real;
};

// Serves files from `root` by resolving each request path against the
// canonical root and verifying containment, so files created after startup
// (e.g. a fresh build) are served without a restart. Responses carry a weak
// stat-based ETag; a matching If-None-Match gets a bodyless 304, so a
// max-age=0 mount revalidates cheaply instead of re-downloading every time.
export const serveStatic = (root: string, maxAge: number): Middleware => {
  // Validated eagerly so a bad maxAge or a missing root throws at startup,
  // before this middleware is mounted, rather than being silently clamped.
  const cacheControl = cacheControlFor(maxAge);
  const rootReal = realpathSync(root);

  return async (ctx, next) => {
    const path = resolveWithinRoot(rootReal, ctx.url.pathname);
    if (!path) {
      await next();
      return;
    }
    const info = statSync(path);
    if (info.isDirectory()) {
      await next();
      return;
    }
    // Weak validator from stat alone — no content hashing (std's serveDir
    // SHA-256s the body). It changes whenever the file is rewritten.
    // If-None-Match on GET/HEAD compares weakly, so the W/ prefix is fine.
    const etag = `W/"${info.size}-${info.mtimeMs}"`;
    const headers = { "cache-control": cacheControl, etag };
    const ifNoneMatch = ctx.req.headers.get("if-none-match");
    if (
      (ctx.req.method === "GET" || ctx.req.method === "HEAD") &&
      ifNoneMatch?.split(",").some((tag) => {
        const t = tag.trim();
        return t === "*" || t.replace(/^W\//, "") === etag.replace(/^W\//, "");
      })
    ) {
      ctx.res = new Response(null, { status: 304, headers });
      return;
    }
    const file = Bun.file(path);
    ctx.res = new Response(file, {
      headers: {
        ...headers,
        "content-type": file.type || "application/octet-stream",
      },
    });
  };
};
