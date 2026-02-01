import { SupportedCBOR, SupportedMapsCBOR } from "../src/cbor.ts";

type Option = "autoincrement" | "null";

class Column {
  constructor(
    public readonly name: string,
    public readonly t: "bigint" | "string" | "timestamp",
    public readonly options: Set<Option> = new Set(),
  ) {}

  public browserToNetwork = (input: string | number | null) => {
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

const zeroPad = (input: number) => String(input).padStart(2, "0");

export const dateToLocal = (date: Date) => {
  if (!date) return "";

  return date.getFullYear() + "-" +
    zeroPad(date.getMonth() + 1) + "-" +
    zeroPad(date.getDate()) + "T" + zeroPad(date.getHours()) + ":" +
    zeroPad(date.getMinutes());
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
      const v = input.get(c.name) as typeof aReference.valueType;
      if (v === undefined) return;

      result[c.name] = (c.options.has("null") && !v) ? null : v;
    });

    return result;
  };
}

class Reference extends Model {
  public override get schema() {
    return [
      new Column("id", "string", new Set(["autoincrement"])),
      new Column("name", "string"),

      new Column("url", "string", new Set(["null"])),
      new Column("wikipedia", "string", new Set(["null"])),

      new Column("bandcamp", "string", new Set(["null"])),
      new Column("apple_music", "string", new Set(["null"])),
      new Column("spotify", "string", new Set(["null"])),
      new Column("tidal", "string", new Set(["null"])),
      new Column("discogs", "string", new Set(["null"])),

      new Column("goodreads", "string", new Set(["null"])),
    ];
  }

  declare public readonly valueType:
    | number
    | bigint
    | string
    | null
    | undefined;
}

export const aReference = new Reference();

class Article extends Model {
  public override get schema() {
    return [
      new Column("id", "bigint", new Set(["autoincrement"])),
      new Column("markdown", "string"),
      new Column("published", "timestamp", new Set(["null"])),
      new Column("title", "string", new Set(["null"])),
    ];
  }

  declare public readonly valueType:
    | string
    | number
    | bigint
    | Date
    | null
    | undefined;
}

export const anArticle = new Article();
