import { createDefine } from "fresh";

import { Session } from "@/src/session.ts";
import { State } from "@/src/state.ts";
import { User } from "@/src/user.ts";

export const SITE_NAME: string = Deno.env.get("SITE_NAME") || "RM";

interface AuthenticatedState extends State {
  session: Session;
  user: User;
}

export const define = createDefine<State>();
export const authenticatedDefine = createDefine<AuthenticatedState>();
