export const joinUint8Arrays = (input: Uint8Array[]): Uint8Array => {
  const result = new Uint8Array(input.reduce((a, c) => a + c.byteLength, 0));

  let offset = 0;
  input.forEach((i) => {
    result.set(i, offset);
    offset += i.byteLength;
  });

  return result;
};
