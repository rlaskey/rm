import { equal } from "@std/assert";
import { deleteCookie, getCookies, setCookie, UserAgent } from "@std/http";
import { ulid } from "@std/ulid";

import { kv } from "@/src/kv.ts";
import { AuthenticatedUser } from "@/src/user.ts";

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

export interface Session {
  id: string;
  userAgentMatch: UserAgentMatch;
  save?: boolean;

  // Credentials
  challenge?: string;
  futureUser?: AuthenticatedUser;

  userId?: string;
  write?: boolean;
}

export interface AuthenticatedSession extends Session {
  userId: string;
}

const uaToMatch = (ua: UserAgent): UserAgentMatch => {
  return {
    browserName: ua.browser.name || "??",
    cpuArchitecture: ua.cpu.architecture || "??",
    engineName: ua.engine.name || "??",
    osName: ua.os.name || "??",
  };
};

const userAgent = (headers: Headers): UserAgent => {
  return new UserAgent(headers.get("user-agent"));
};

export const getSession = async (headers: Headers): Promise<Session | null> => {
  const id: string | null = getCookies(headers)[COOKIE_NAME] || null;
  if (id === null) return null;

  const key: string[] = [KV_KEY, id];
  const result = await kv.get<Session>(key);
  if (result.versionstamp === null) return null;

  // We only restrict on basic UA checks.
  // If these have changed, something is wrong.
  if (!equal(uaToMatch(userAgent(headers)), result.value.userAgentMatch)) {
    await kv.delete(key);
    return null;
  }

  return result.value;
};

export const emptySession = (headers: Headers): Session => {
  return {
    id: ulid(),
    userAgentMatch: uaToMatch(userAgent(headers)),
    save: true,
  };
};

export const setSession = async (
  response: Response,
  session: Session | null,
): Promise<void> => {
  if (session === null) return;

  if (!session.save) return;
  delete session.save;

  await kv.set([KV_KEY, session.id], session, {
    expireIn: 1000 * SECONDS_IN_DAY * (DAYS + 1),
  });

  setCookie(response.headers, {
    name: COOKIE_NAME,
    value: session.id,
    maxAge: SECONDS_IN_DAY * DAYS,
    sameSite: "Strict",
    secure: true,
    path: "/",
    httpOnly: true,
  });
};

export const deleteSession = async (
  response: Response,
  session: Session | null,
): Promise<void> => {
  if (session === null) return;
  await kv.delete([KV_KEY, session.id]);
  deleteCookie(response.headers, COOKIE_NAME);
};
