import { HttpError } from "fresh";

import { authenticatedDefine } from "@/src/define.ts";
import { db } from "@/src/sqlite.ts";

export const handler = authenticatedDefine.handlers({
  GET({ state }) {
    // We ONLY want this for cases where we have ZERO admins.
    if (db.prepare("SELECT * FROM user WHERE write = 1").all().length) {
      throw new HttpError(400);
    }

    if (
      db.prepare("UPDATE user SET write = 1 WHERE id = ?").run(state.user.id)
        .changes !== 1
    ) throw new HttpError(400);

    return new Response(null, {
      status: 307,
      headers: { Location: "/e" },
    });
  },
});
