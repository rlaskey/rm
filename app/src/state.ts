import { equal } from "@std/assert";

import { toObject } from "@/src/cbor.ts";
import { cborDecode } from "@/src/cbor-decode.ts";
import {
  getSessionId,
  Session,
  SessionData,
  uaToMatch,
  userAgent,
} from "@/src/session.ts";
import { db } from "@/src/sqlite.ts";
import { User } from "@/src/user.ts";

export interface State {
  session: Session | undefined;
  user: User | undefined;
}

export const getState = (reqHeaders: Headers): State | null => {
  const id: string | null = getSessionId(reqHeaders);
  if (id === null) return null;

  const select = db.prepare(
    "SELECT s.*, u.name, u.write FROM session s " +
      "LEFT JOIN user u ON s.user_id = u.id WHERE s.id = ?",
  ).get(id);
  if (!select) return null;

  const result = {
    session: {
      id: select.id as string,
      data: toObject(
        cborDecode(select.data as Uint8Array) as object,
      ) as SessionData,
      updated_at: select.updated_at as number,
      user_id: select.user_id as number | bigint | null,
    },
    user: select.user_id
      ? {
        id: select.user_id as number | bigint,
        name: select.name as string,
        write: Boolean(select.write),
      }
      : null,
  } as State;

  if (
    !equal(
      uaToMatch(userAgent(reqHeaders)),
      result.session?.data.userAgentMatch,
    )
  ) {
    db.prepare("DELETE FROM session WHERE id = ?").run(id);
    return null;
  }

  return result;
};
