// Hand-rolled cookie helpers (replacing @std/http).
// Cookie values cannot contain ";", ",", quotes, or whitespace per
// RFC 6265, so splitting on ";" and the first "=" is safe.

const assertValid = (s: string) => {
  if (/[\x00-\x20\x7f;,"]/.test(s)) {
    throw new Error(`Invalid cookie name/value: ${JSON.stringify(s)}`);
  }
};

export const getCookies = (headers: Headers): Record<string, string> => {
  const header = headers.get("cookie");
  const out: Record<string, string> = {};
  if (!header) return out;

  for (const pair of header.split(";")) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    if (!name) continue;
    out[name] = pair.slice(eq + 1).trim();
  }

  return out;
};

interface CookieAttributes {
  name: string;
  value: string;
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export const setCookie = (headers: Headers, c: CookieAttributes) => {
  assertValid(c.name);
  assertValid(c.value);

  const parts = [`${c.name}=${c.value}`];
  if (c.maxAge !== undefined) parts.push(`Max-Age=${c.maxAge}`);
  if (c.expires) parts.push(`Expires=${c.expires.toUTCString()}`);
  if (c.path) parts.push(`Path=${c.path}`);
  if (c.domain) parts.push(`Domain=${c.domain}`);
  if (c.secure) parts.push("Secure");
  if (c.httpOnly) parts.push("HttpOnly");
  if (c.sameSite) parts.push(`SameSite=${c.sameSite}`);

  headers.append("set-cookie", parts.join("; "));
};

export const deleteCookie = (headers: Headers, name: string, path = "/") => {
  assertValid(name);
  headers.append(
    "set-cookie",
    `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}`,
  );
};
