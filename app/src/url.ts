export const getId = (prefix: string, path: string): bigint | null => {
  if (!path.startsWith(prefix)) return null;
  return BigInt(path.substring(prefix.length));
};
