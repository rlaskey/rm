export const asUint8Array = (input: Uint8Array | ArrayBuffer): Uint8Array =>
  input instanceof Uint8Array ? input : new Uint8Array(input);

export const equalUint8Arrays = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
};

export const joinUint8Arrays = (
  input: (Uint8Array | ArrayBuffer)[],
): Uint8Array => {
  const parts = input.map(asUint8Array);
  const result = new Uint8Array(parts.reduce((a, c) => a + c.byteLength, 0));

  let offset = 0;
  parts.forEach((i) => {
    result.set(i, offset);
    offset += i.byteLength;
  });

  return result;
};
