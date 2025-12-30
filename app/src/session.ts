import { equal } from "@std/assert";
import { ulid } from "@std/ulid";
import { deleteCookie, getCookies, setCookie, UserAgent } from "@std/http";

import { kv } from "@/src/kv.ts";
import { UserKV } from "@/src/user.ts";

const KV_KEY: string = "session";
const COOKIE_NAME: string = "rm";
const DAYS: number = parseInt(Deno.env.get("SESSION_DAYS") || "27", 10);
const SECONDS_IN_DAY: number = 60 * 60 * 24;

// Subset of UA attributes where we do not want any drift.
// Keep this construct small.
type UserAgentMatch = {
  browserName: string;
  cpuArchitecture: string;
  engineName: string;
  osName: string;
};

type Session = {
  userAgentMatch: UserAgentMatch;
  authenticating?: {
    challenge: string;
    newUserKV: UserKV | null;
  };
  userKV: UserKV | null;
};

export type SessionKV = {
  key: string;
  value: Session;
};

const uaToMatch = (ua: UserAgent): UserAgentMatch => {
  return {
    browserName: ua.browser.name || "??",
    cpuArchitecture: ua.cpu.architecture || "??",
    engineName: ua.engine.name || "??",
    osName: ua.os.name || "??",
  };
};

const fromKV = async (
  id: string,
  ua: UserAgent,
): Promise<Session | null> => {
  const key: string[] = [KV_KEY, id];
  const result = await kv.get<Session>(key);

  // Not found in the DB
  if (result.versionstamp === null) return null;

  // We only restrict on basic UA checks.
  // If these have changed, something is wrong.
  if (!equal(uaToMatch(ua), result.value.userAgentMatch)) {
    await kv.delete(key);
    return null;
  }

  return result.value;
};

const userAgent = (headers: Headers): UserAgent => {
  return new UserAgent(headers.get("user-agent"));
};

export const getSession = async (
  headers: Headers,
): Promise<SessionKV | null> => {
  const id: string | null = getCookies(headers)[COOKIE_NAME] || null;
  if (id === null) return null;

  const data: Session | null = await fromKV(id, userAgent(headers));

  return data ? { key: id, value: data } : null;
};

export const newSession = (headers: Headers): SessionKV => {
  return {
    key: ulid(),
    value: { userAgentMatch: uaToMatch(userAgent(headers)), userKV: null },
  };
};

export const saveSession = async (
  response: Response,
  sessionKV: SessionKV | null,
): Promise<void> => {
  if (sessionKV === null) return;

  await kv.set([KV_KEY, sessionKV.key], sessionKV.value, {
    expireIn: 1000 * SECONDS_IN_DAY * (DAYS + 1),
  });

  setCookie(response.headers, {
    name: COOKIE_NAME,
    value: sessionKV.key,
    maxAge: SECONDS_IN_DAY * DAYS,
    sameSite: "Strict",
    secure: true,
    path: "/",
    httpOnly: true,
  });
};

export const destroySession = async (
  response: Response,
  sessionKV: SessionKV | null,
) => {
  if (sessionKV === null) return;
  await kv.delete([KV_KEY, sessionKV.key]);
  deleteCookie(response.headers, COOKIE_NAME);
};
