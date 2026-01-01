import { kv } from "@/src/kv.ts";

const KV_KEY: string = "user";

export interface AuthenticatedUser extends User {
  passkeys: Set<Base64URLString>;
}

export interface User {
  id: string; // ulid
  name: string; // Passkeys need a name.
  passkeys?: Set<Base64URLString>;
  write?: boolean;
}

export const listUser = (): Deno.KvListIterator<User[]> =>
  kv.list<User[]>({ prefix: [KV_KEY] }, {
    limit: 23,
    reverse: true,
  });

export const getUser = async (
  id: string,
): Promise<AuthenticatedUser | null> => {
  const result = await kv.get<AuthenticatedUser>([KV_KEY, id]);
  if (result.versionstamp === null) return null;
  return result.value;
};

export const setUser = async (
  authenticatedUser: AuthenticatedUser,
): Promise<Deno.KvCommitResult> => {
  return await kv.set([KV_KEY, authenticatedUser.id], authenticatedUser);
};
