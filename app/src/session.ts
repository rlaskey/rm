import { deleteCookie, getCookies, setCookie, UserAgent } from "@std/http";
import { ulid } from "@std/ulid";

import { cborEncode } from "@/src/cbor-encode.ts";
import { db } from "@/src/sqlite.ts";
import { FutureUser } from "@/src/user.ts";

const COOKIE_NAME: string = "rm";
const DAYS: number = parseInt(Deno.env.get("SESSION_DAYS") || "27", 10);
const SECONDS_IN_DAY: number = 60 * 60 * 24;

// Subset of UA attributes where we do not want any drift.
// Keep this construct small.
interface UserAgentMatch {
  browserName: string;
  cpuArchitecture: string;
  engineName: string;
  osName: string;
}

export interface SessionData {
  userAgentMatch: UserAgentMatch;
  challenge?: string;
  futureUser?: FutureUser;
}

export interface Session {
  id: string;
  data: SessionData;
  updated_at: number;
  user_id: number | bigint | null;
}

export const uaToMatch = (ua: UserAgent): UserAgentMatch => {
  return {
    browserName: ua.browser.name || "??",
    cpuArchitecture: ua.cpu.architecture || "??",
    engineName: ua.engine.name || "??",
    osName: ua.os.name || "??",
  };
};

export const userAgent = (headers: Headers): UserAgent =>
  new UserAgent(headers.get("user-agent"));

export const getSessionId = (headers: Headers) =>
  getCookies(headers)[COOKIE_NAME] || null;

export const blankSession = (headers: Headers): Session => {
  return {
    id: ulid(),
    data: {
      userAgentMatch: uaToMatch(userAgent(headers)),
    },
    updated_at: Date.now(),
    user_id: null,
  };
};

export const setSession = (
  response: Response,
  session: Session | undefined,
  start: string,
): void => {
  if (!session) {
    if (start) deleteCookie(response.headers, COOKIE_NAME);
    return;
  }
  if (JSON.stringify(session) === start) return;

  const data = cborEncode(session.data);
  session.updated_at = Date.now();

  if (!start) {
    db.prepare("INSERT INTO session VALUES (?, ?, ?, ?)").run(
      session.id,
      data,
      session.updated_at,
      session.user_id,
    );
  } else {
    db.prepare(
      "UPDATE session SET data = ?, updated_at = ?, user_id = ? " +
        "WHERE id = ?",
    ).run(
      data,
      session.updated_at,
      session.user_id,
      session.id,
    );
  }

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

export const deleteSession = (
  response: Response,
  session: Session | undefined,
): void => {
  if (!session) return;
  db.prepare("DELETE FROM session WHERE id = ?").run(session.id);
  deleteCookie(response.headers, COOKIE_NAME);
};
