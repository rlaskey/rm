import { getCookies, UserAgent } from "@std/http";
import { ulid } from "@std/ulid";

import { FutureUser } from "@/src/user.ts";

export const COOKIE_NAME: string = "rm";
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
