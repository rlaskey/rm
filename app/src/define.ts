import { createDefine } from "fresh";
import { SessionKV } from "@/src/session.ts";

export type State = {
  sessionKV: SessionKV | null;
};

export const SITE_NAME: string = Deno.env.get("SITE_NAME") || "RM";

export const define = createDefine<State>();
