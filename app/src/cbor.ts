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
