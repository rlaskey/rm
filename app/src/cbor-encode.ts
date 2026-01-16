import {
  joinUint8Arrays,
  SupportedArraysCBOR,
  SupportedCBOR,
  SupportedMapsCBOR,
} from "./cbor.ts";

const head = (majorType: number, value: number | bigint): Uint8Array => {
  if (value < 24) {
    const result = new Uint8Array(1);
    result[0] = (majorType << 5) + Number(value);
    return result;
  }
  if (value < 2 ** 8) {
    const result = new Uint8Array(2);
    result[0] = (majorType << 5) + 24;
    const view = new DataView(result.buffer);
    view.setUint8(1, Number(value));
    return result;
  }
  if (value < 2 ** 16) {
    const result = new Uint8Array(3);
    result[0] = (majorType << 5) + 25;
    const view = new DataView(result.buffer);
    view.setUint16(1, Number(value));
    return result;
  }
  if (value < 2 ** 32) {
    const result = new Uint8Array(4);
    result[0] = (majorType << 5) + 26;
    const view = new DataView(result.buffer);
    view.setUint32(1, Number(value));
    return result;
  }
  if (value < 2 ** 64) {
    const result = new Uint8Array(5);
    result[0] = (majorType << 5) + 27;
    const view = new DataView(result.buffer);
    view.setBigUint64(1, BigInt(value));
    return result;
  }

  throw new RangeError("Unsupported: value >64 bits.");
};

const encodeObject = (input: object): Uint8Array => {
  const result: Uint8Array[] = [];
  result.push(head(5, Object.keys(input).length));
  for (const [k, v] of Object.entries(input)) {
    result.push(cborEncode(k));
    result.push(cborEncode(v));
  }
  return joinUint8Arrays(result);
};

const encodeMap = (input: SupportedMapsCBOR): Uint8Array => {
  const result: Uint8Array[] = [];
  result.push(head(5, input.size));
  input.forEach((v, k) => {
    result.push(cborEncode(k));
    result.push(cborEncode(v));
  });
  return joinUint8Arrays(result);
};

const encodeArray = (input: SupportedArraysCBOR): Uint8Array => {
  const result: Uint8Array[] = [];
  result.push(head(4, input.length));
  input.forEach((v) => result.push(cborEncode(v)));
  return joinUint8Arrays(result);
};

const encodeBytes = (input: Uint8Array): Uint8Array => {
  return joinUint8Arrays([head(2, input.byteLength), input]);
};

const encodeString = (input: string): Uint8Array => {
  const tail = (new TextEncoder()).encode(input);
  return joinUint8Arrays([head(3, tail.byteLength), tail]);
};

const encodeUndefined = (): Uint8Array => {
  const result = new Uint8Array(1);
  result[0] = (7 << 5) + 23;
  return result;
};

const encodeNull = (): Uint8Array => {
  const result = new Uint8Array(1);
  result[0] = (7 << 5) + 22;
  return result;
};

const encodeBoolean = (input: boolean): Uint8Array => {
  const result = new Uint8Array(1);
  result[0] = (7 << 5) + (input ? 21 : 20);
  return result;
};

const encodeBigInt = (input: bigint): Uint8Array => {
  return input < 0 ? head(1, BigInt(-1) - input) : head(0, input);
};

const encodeInteger = (input: number): Uint8Array => {
  return input < 0 ? head(1, -1 - input) : head(0, input);
};

const encodeFloat = (_input: number): Uint8Array => {
  throw new Error("Not yet supported");
};

const encodeNumber = (input: number): Uint8Array => {
  return (input % 1 === 0) ? encodeInteger(input) : encodeFloat(input);
};

export const cborEncode = (input: SupportedCBOR): Uint8Array => {
  switch (typeof input) {
    case "number":
      return encodeNumber(input);
    case "bigint":
      return encodeBigInt(input);
    case "string":
      return encodeString(input);
    case "boolean":
      return encodeBoolean(input);
    case "object":
      if (input === null) return encodeNull();
      if (Array.isArray(input)) return encodeArray(input);
      if (input instanceof Map) return encodeMap(input);
      if (input instanceof Uint8Array) return encodeBytes(input);
      return encodeObject(input);
    case "undefined":
      return encodeUndefined();
  }

  throw new Error("Not yet supported.");
};
