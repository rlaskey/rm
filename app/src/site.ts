import { kv } from "@/src/kv.ts";

const KV_KEY: string = "site";

export type Site = {
  admins: Set<Base64URLString>;
};

export const getSite = async (): Promise<Site> => {
  const result = await kv.get<Site>([KV_KEY]);

  if (result.versionstamp === null) {
    const site: Site = { admins: new Set() };
    if (!(await setSite(site)).ok) throw new Error("??");
    return site;
  }

  return result.value;
};

export const setSite = async (site: Site): Promise<Deno.KvCommitResult> => {
  return await kv.set([KV_KEY], site);
};
