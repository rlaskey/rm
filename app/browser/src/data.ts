import { type SupportedCBOR, type SupportedMapsCBOR } from "../../src/cbor.ts";

type Option = "autoincrement" | "null" | "readonly";

class Column {
  constructor(
    public readonly name: string,
    public readonly t: "bigint" | "string" | "timestamp",
    public readonly options: Set<Option> = new Set(),
  ) {}

  public browserToNetwork = (input: string | number | null) => {
    if (typeof input === "string") input = input.trim();
    if (!input) return null;

    if (this.t === "timestamp") {
      if (typeof input !== "string") return null;
      return BigInt((new Date(input)).getTime() / 1000);
    }
    if (this.t === "bigint") return BigInt(input);

    if (typeof input === "number") return BigInt(input);
    return input;
  };
}

const secondsToDate = (input: number | bigint) => {
  if (!input) return null;
  return new Date(Number(input) * 1000);
};

abstract class Model {
  public get schema(): Column[] {
    return [];
  }

  public readonly valueType: unknown;

  public networkToState = (
    input: SupportedCBOR,
  ): Record<string, typeof this.valueType> => {
    if (!(input instanceof Map)) throw Error("Bad input.");

    const result: Record<string, typeof this.valueType> = {};
    this.schema.forEach((c) => {
      let v = input.get(c.name) as typeof this.valueType;
      if (c.t === "timestamp") v = secondsToDate(v as bigint);
      result[c.name] = v || "";
    });

    return result;
  };

  public stateToNetwork = (input: typeof this.valueType) => {
    if (input instanceof Date) return BigInt(input.getTime() / 1000);
    return input;
  };

  public forInsert = (
    input: SupportedMapsCBOR,
  ): Record<string, typeof this.valueType> => {
    // Complete records. Skips NULLs.
    const result: Record<string, typeof this.valueType> = {};

    this.schema.forEach((c) => {
      if (c.options.has("autoincrement")) return;
      const v = input.get(c.name) as typeof aReference.valueType;
      if (c.options.has("null") && !v) return;
      result[c.name] = v;
    });

    return result;
  };

  public forUpdate = (
    input: SupportedMapsCBOR,
  ): Record<string, typeof this.valueType> => {
    // Partial updates. Sets NULLs.
    const result: Record<string, typeof this.valueType> = {};

    this.schema.forEach((c) => {
      if (c.options.has("autoincrement")) return;
      if (c.options.has("readonly")) return;
      const v = input.get(c.name) as typeof aReference.valueType;
      if (v === undefined) return;

      result[c.name] = (c.options.has("null") && !v) ? null : v;
    });

    return result;
  };
}

class File extends Model {
  public override get schema() {
    return [
      new Column("id", "bigint", new Set(["autoincrement"])),
      new Column("md5", "string", new Set(["readonly"])),
      new Column("content_type", "string", new Set(["null", "readonly"])),
      new Column("title", "string", new Set(["null"])),
    ];
  }

  declare public readonly valueType:
    | string
    | bigint
    | null
    | undefined;
}

export const aFile = new File();

class Article extends Model {
  public override get schema() {
    return [
      new Column("id", "bigint", new Set(["autoincrement"])),
      new Column("words", "string"),
      new Column("published", "timestamp", new Set(["null"])),
      new Column("title", "string", new Set(["null"])),
    ];
  }

  declare public readonly valueType:
    | string
    | bigint
    | Date
    | null
    | undefined;
}

export const anArticle = new Article();

class Reference extends Model {
  public override get schema() {
    return [
      new Column("id", "bigint", new Set(["autoincrement"])),
      new Column("name", "string"),
    ];
  }

  declare public readonly valueType:
    | bigint
    | number
    | string
    | null
    | undefined;
}

export const aReference = new Reference();

class LabeledURL extends Model {
  public override get schema() {
    return [
      new Column("id", "string"),
      new Column("reference_id", "bigint"),
      new Column("label", "string", new Set(["null"])),
    ];
  }

  declare public readonly valueType:
    | bigint
    | string
    | undefined;
}

export const aLabeledURL = new LabeledURL();
