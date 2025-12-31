import { createDefine } from "fresh";
import { AuthenticatedSession, Session } from "@/src/session.ts";

export const SITE_NAME: string = Deno.env.get("SITE_NAME") || "RM";

export interface State {
  session: Session | null;
}

interface AuthenticatedState extends State {
  session: AuthenticatedSession;
}

export const define = createDefine<State>();
export const authenticatedDefine = createDefine<AuthenticatedState>();
