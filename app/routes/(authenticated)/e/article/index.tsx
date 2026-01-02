import { ulid } from "@std/ulid";

import { authenticatedDefine } from "@/src/define.ts";

export const handler = authenticatedDefine.handlers({
  GET() {
    return new Response(null, {
      status: 307,
      headers: { Location: "/e/article/" + ulid() },
    });
  },
});
