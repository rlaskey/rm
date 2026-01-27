import { equal } from "@std/assert";

import { cborDecode } from "./cbor-decode.ts";
import { getSessionId, Session, uaToMatch, userAgent } from "./session.ts";
import { db } from "./sqlite.ts";
import { User } from "./user.ts";

export interface State {
  session: Session | undefined;
  user: User | undefined;
}

export const getState = (reqHeaders: Headers): State | null => {
  const id: string | null = getSessionId(reqHeaders);
  if (id === null) return null;

  using stmt = db.prepare(
    "SELECT s.*, u.name, u.write FROM session s " +
      "LEFT JOIN user u ON s.user_id = u.id WHERE s.id = ?",
  );
  const select = stmt.get(id);
  if (!select) return null;

  const result = {
    session: {
      id: select.id as string,
      data: cborDecode(select.data as Uint8Array),
      updated_at: select.updated_at as number,
      user_id: select.user_id as number | bigint | null,
    },
    user: select.user_id
      ? new Map<string, number | bigint | string | boolean>([
        ["id", select.user_id as number | bigint],
        ["name", select.name as string],
        ["write", Boolean(select.write)],
      ])
      : null,
  } as State;

  if (
    !equal(
      uaToMatch(userAgent(reqHeaders)),
      result.session?.data.get("userAgentMatch"),
    )
  ) {
    db.prepare("DELETE FROM session WHERE id = ?").run(id);
    return null;
  }

  return result;
};
