import { type Middleware } from "../../src/framework.ts";
import { type User } from "../../src/user.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborResponse } from "../../src/cbor-encode.ts";
import { db } from "../../src/sqlite.ts";

const select = (
  user: User,
): { name: string; write: boolean; passkeys: string[] } => {
  using stmt = db.prepare("SELECT id FROM passkey WHERE user_id = ?");
  const passkeys = stmt.values<[string]>(user.get("id")).flat();
  return {
    name: user.get("name") as string,
    write: user.get("write") as boolean,
    passkeys,
  };
};

export const meGET: Middleware = (ctx, _) => {
  ctx.res = cborResponse(select(ctx.state.user!));
};

export const mePOST: Middleware = async (ctx, _) => {
  const req = cborDecode(await ctx.req.bytes());
  if (!req || !(req instanceof Map)) {
    ctx.res = new Response(null, { status: 400 });
    return;
  }

  const result: { name?: string } = {};

  const name = req.get("name") as string;
  if (name) {
    using stmt = db.prepare("UPDATE user SET name = ? WHERE id = ?");
    if (stmt.run(name, ctx.state.user?.get("id")) !== 1) {
      ctx.res = new Response("Name not saved.", { status: 500 });
      return;
    }

    result.name = name;
  }

  ctx.res = cborResponse(result);
};
