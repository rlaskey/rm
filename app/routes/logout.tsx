import { define } from "@/src/define.ts";
import { db } from "@/src/sqlite.ts";

export const handler = define.handlers({
  GET({ state, redirect }) {
    if (state.session) {
      db.prepare("DELETE FROM session WHERE id = ?").run(state.session.id);
    }

    // This sets up the session middleware to delete the cookie.
    state.session = undefined;
    return redirect("/");
  },
});
