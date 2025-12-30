const path: string = Deno.env.get("KV_PATH") ??
  Deno.env.get("HOME") + "/rm.sqlite";

export const kv = await Deno.openKv(path);
