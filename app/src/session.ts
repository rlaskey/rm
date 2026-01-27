import { getCookies, UserAgent } from "@std/http";
import { ulid } from "@std/ulid";

import { User } from "./user.ts";

export const COOKIE_NAME: string = "rm";

type UserAgentMatch = Map<string, string>;

export interface Session {
  id: string;
  data: Map<string, UserAgentMatch | string | User>;
  updated_at: number;
  user_id: number | bigint | null;
}

// Subset of UA attributes where we do not want any drift.
// Keep this construct small.
export const uaToMatch = (ua: UserAgent) =>
  new Map<string, string>([
    ["browserName", ua.browser.name || "??"],
    ["cpuArchitecture", ua.cpu.architecture || "??"],
    ["engineName", ua.engine.name || "??"],
    ["osName", ua.os.name || "??"],
  ]);

export const userAgent = (headers: Headers): UserAgent =>
  new UserAgent(headers.get("user-agent"));

export const getSessionId = (headers: Headers) =>
  getCookies(headers)[COOKIE_NAME] || null;

export const blankSession = (headers: Headers): Session => {
  return {
    id: ulid(),
    data: new Map([["userAgentMatch", uaToMatch(userAgent(headers))]]),
    updated_at: Date.now(),
    user_id: null,
  };
};
