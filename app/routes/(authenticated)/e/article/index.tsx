import { ulid } from "@std/ulid";

import { authenticatedDefine } from "@/src/define.ts";

export const handler = authenticatedDefine.handlers({
  GET({ redirect }) {
    return redirect("/e/article/" + ulid());
  },
});
