import { ulid } from "@std/ulid";
import { kv } from "@/src/kv.ts";

const KV_KEY: string = "user";

type User = {
  name: string;
  passkeys: Set<Base64URLString>;
  write: boolean;
};

export type UserKV = {
  key: string; // ulid
  value: User;
};

export const blankUserKV = (name: string): UserKV => {
  return {
    key: ulid(),
    value: {
      name: name,
      passkeys: new Set(),
      write: false,
    },
  };
};

export const getUserFromKV = async (key: string): Promise<User | null> => {
  const result = await kv.get<User>([KV_KEY, key]);
  if (result.versionstamp === null) return null;
  return result.value;
};

export const storeUserKV = async (
  input: UserKV,
): Promise<Deno.KvCommitResult> => {
  return await kv.set([KV_KEY, input.key], input.value);
};
