import { getCookies } from "./cookies.ts";

import { User } from "./user.ts";

export const COOKIE_NAME: string = "rm";

export interface Session {
  id: string;
  data: Map<string, string | User>;
  updated_at: number;
  user_id: number | bigint | null;
}

export const getSessionId = (headers: Headers) =>
  getCookies(headers)[COOKIE_NAME] || null;

export const timestampSeconds = () => Math.floor(Date.now() / 1000);

export const blankSession = (): Session => {
  return {
    id: crypto.randomUUID(),
    data: new Map(),
    updated_at: timestampSeconds(),
    user_id: null,
  };
};
