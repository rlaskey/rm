// https://cborbook.com/part_1/practical_introduction_to_cbor.html
type AdditionalInformation31 = "31";
type SupportedMajorType7 =
  | boolean
  | null
  | undefined
  | Float16Array
  | Float32Array
  | Float64Array;
type SupportedArraysCBOR = SupportedOutputCBOR[];
type SupportedMapsCBOR = Map<number | string, SupportedOutputCBOR>;
export type SupportedOutputCBOR =
  | SupportedArraysCBOR
  | SupportedMapsCBOR
  | number
  | bigint
  | Uint8Array
  | string
  | SupportedMajorType7;

// NOTE: I'm not clear on what this needs to be.
const additionalInformation = (
  uint8Array: Uint8Array,
  start: number,
): [AdditionalInformation31 | number | bigint, number] => {
  const byte0: number | undefined = uint8Array.at(start);
  if (typeof byte0 === "undefined") {
    throw new Error("Malformed AdditionalInformation.");
  }

  const here: number = byte0 & 0b11111;
  if (0 <= here && here <= 23) return [here, start + 1];
  if (here === 24) {
    return [
      new DataView(uint8Array.buffer, start + 1, 1).getUint8(0),
      start + 2,
    ];
  }
  if (here === 25) {
    return [
      new DataView(uint8Array.buffer, start + 1, 2).getUint16(0),
      start + 3,
    ];
  }
  if (here === 26) {
    return [
      new DataView(uint8Array.buffer, start + 1, 4).getUint32(0),
      start + 5,
    ];
  }
  if (here === 27) {
    // Will this work? Maybe not?
    return [
      new DataView(uint8Array.buffer, start + 1, 8).getBigUint64(0),
      start + 9,
    ];
  }
  if (here === 31) {
    return ["31", start + 1];
  }

  throw new Error("Malformed additionalInformation.");
};

const decodeUint = (
  uint8Array: Uint8Array,
  start: number,
): [number | bigint, number] => {
  const aI = additionalInformation(uint8Array, start);
  if (aI[0] === "31") {
    throw new Error(
      "Unsupported: Indefinite-length unsigned integer.",
    );
  }

  return [aI[0], aI[1]];
};

const decodeNegativeInt = (
  uint8Array: Uint8Array,
  start: number,
): [number | bigint, number] => {
  const aI = additionalInformation(uint8Array, start);
  if (aI[0] === "31") {
    throw new Error(
      "Unsupported: Indefinite-length negative integer.",
    );
  }

  if (typeof aI[0] === "bigint") {
    return [BigInt(-1) - aI[0], aI[1]];
  }

  return [-1 - aI[0], aI[1]];
};

const decodeByteString = (
  uint8Array: Uint8Array,
  start: number,
): [Uint8Array, number] => {
  const aI = additionalInformation(uint8Array, start);
  if (aI[0] === "31") {
    throw new Error(
      "Not yet supported: Indefinite-length Byte strings.",
    );
  }

  if (typeof aI[0] === "bigint") {
    throw new Error("Not yet supported: bigint length Byte strings.");
  }

  return [
    // NOTE: we are using `slice` and NOT `subarray` here.
    // This creates a separate copy of the underlying bytes.
    // This matters because if you run `.buffer`,
    // you'll get more than what you see otherwise.
    uint8Array.slice(aI[1], aI[1] + aI[0]),
    aI[1] + aI[0],
  ];
};

const decodeTextString = (
  uint8Array: Uint8Array,
  start: number,
): [string, number] => {
  const aI = additionalInformation(uint8Array, start);
  if (aI[0] === "31") {
    throw new Error(
      "Not yet supported: Indefinite-length Text strings.",
    );
  }

  if (typeof aI[0] === "bigint") {
    throw new Error(
      "Not yet supported: bigint length Text strings.",
    );
  }

  return [
    (new TextDecoder()).decode(uint8Array.subarray(aI[1], aI[1] + aI[0])),
    aI[1] + aI[0],
  ];
};

const decodeArray = (
  uint8Array: Uint8Array,
  start: number,
): [SupportedArraysCBOR, number] => {
  const aI = additionalInformation(uint8Array, start);
  if (typeof aI[0] === "bigint") {
    throw new Error(
      "Not yet supported: bigint length of an Array.",
    );
  }
  if (aI[0] === "31") {
    throw new Error("Not yet supported: Indefinite-length Arrays.");
  }

  const result: SupportedArraysCBOR = [];

  let position = aI[1];
  for (let i = 0; i < aI[0]; i++) {
    const j = decodeItem(uint8Array, position);
    position = j[1];
    result.push(j[0]);
  }
  return [result, position];
};

const decodeMap = (
  uint8Array: Uint8Array,
  start: number,
): [SupportedMapsCBOR, number] => {
  const aI = additionalInformation(uint8Array, start);
  if (typeof aI[0] === "bigint") {
    throw new Error(
      "Not yet supported: bigint length of a Map.",
    );
  }
  if (aI[0] === "31") {
    throw new Error("Not yet supported: Indefinite-length Maps.");
  }

  const result = new Map();

  let position = aI[1];
  for (let i = 0; i < aI[0]; i++) {
    const k = decodeItem(uint8Array, position);
    position = k[1];
    const v = decodeItem(uint8Array, position);
    position = v[1];

    result.set(k[0], v[0]);
  }
  return [result, position];
};

const decodeMajorType7 = (
  uint8Array: Uint8Array,
  start: number,
): [SupportedMajorType7, number] => {
  const aI = additionalInformation(uint8Array, start);
  if (aI[0] == "31") {
    throw new Error("Unsupported: Indefinite-length Major Type 7.");
  }
  if (aI[0] === 20) return [false, aI[1]];
  if (aI[0] === 21) return [true, aI[1]];
  if (aI[0] === 22) return [null, aI[1]];
  if (aI[0] === 23) return [undefined, aI[1]];
  if (aI[0] === 25) {
    return [
      new Float16Array(uint8Array.subarray(aI[1], aI[1] + aI[0])),
      aI[1] + aI[0],
    ];
  }
  if (aI[0] === 26) {
    return [
      new Float32Array(uint8Array.subarray(aI[1], aI[1] + aI[0])),
      aI[1] + aI[0],
    ];
  }
  if (aI[0] === 27) {
    return [
      new Float64Array(uint8Array.subarray(aI[1], aI[1] + aI[0])),
      aI[1] + aI[0],
    ];
  }

  throw new Error("Malformed Major Type 7.");
};

const decodeItem = (
  uint8Array: Uint8Array,
  start: number,
): [SupportedOutputCBOR, number] => {
  const majorType: number = uint8Array[start] >> 5;

  switch (majorType) {
    case 0:
      return decodeUint(uint8Array, start);
    case 1:
      return decodeNegativeInt(uint8Array, start);
    case 2:
      return decodeByteString(uint8Array, start);
    case 3:
      return decodeTextString(uint8Array, start);
    case 4:
      return decodeArray(uint8Array, start);
    case 5:
      return decodeMap(uint8Array, start);
    case 7:
      return decodeMajorType7(uint8Array, start);
    default:
      throw new Error(`Major Type ${majorType} is not yet supported.`);
  }
};

export const decode = (uint8Array: Uint8Array): SupportedOutputCBOR => {
  const [result, end] = decodeItem(uint8Array, 0);
  if (end !== uint8Array.byteLength) throw Error("Something is off.");
  return result;
};
