// https://cborbook.com/part_1/practical_introduction_to_cbor.html
export type AdditionalInformation31 = "31";
export type SupportedMajorType7 =
  | boolean
  | null
  | undefined
  | Float16Array
  | Float32Array
  | Float64Array;
export type SupportedArraysCBOR = SupportedCBOR[];
export type SupportedMapsCBOR = Map<number | string, SupportedCBOR>;
export type SupportedCBOR =
  | SupportedArraysCBOR
  | SupportedMapsCBOR
  | number
  | bigint
  | Uint8Array
  | string
  | object
  | SupportedMajorType7;

export const joinUint8Arrays = (input: Uint8Array[]): Uint8Array => {
  const result = new Uint8Array(input.reduce((a, c) => a + c.byteLength, 0));

  let offset = 0;
  input.forEach((i) => {
    result.set(i, offset);
    offset += i.byteLength;
  });

  return result;
};

export const toObject = (input: SupportedMapsCBOR | object): object => {
  if (typeof input !== "object" || input === null) return input;
  if (Array.isArray(input)) return input.map((e) => toObject(e));

  const result: { [k: string]: SupportedCBOR } = {};

  if (input instanceof Map) {
    input.forEach((v, k) => {
      result[k] = toObject(v as object);
    });
  } else {
    for (const [k, v] of Object.entries(input)) {
      result[k] = toObject(v as object);
    }
  }

  return result;
};
