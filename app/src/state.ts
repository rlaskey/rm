import { cborDecode } from "./cbor-decode.ts";
import { getSessionId, Session } from "./session.ts";
import { client } from "./sqlite.ts";
import { User } from "./user.ts";

export interface State {
  session: Session | undefined;
  user: User | undefined;
}

export const getState = async (reqHeaders: Headers): Promise<State | null> => {
  const id: string | null = getSessionId(reqHeaders);
  if (id === null) return null;

  const select = (
    await client.execute({
      sql:
        "SELECT s.*, u.name, u.write FROM session s " +
        "LEFT JOIN user u ON s.user_id = u.id WHERE s.id = ?",
      args: [id],
    })
  ).rows[0];
  if (!select) return null;

  const result = {
    session: {
      id: select.id as string,
      data: cborDecode(select.data as ArrayBuffer),
      updated_at: Number(select.updated_at),
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

  return result;
};
