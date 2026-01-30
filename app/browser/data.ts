type Option = "autoincrement" | "null";

class Column {
  constructor(
    public readonly name: string,
    public readonly t: "bigint" | "string" | "timestamp",
    public readonly options: Set<Option> = new Set(),
  ) {}

  public fromBrowser = (input: string | number | null) => {
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

export class Reference {
  constructor(public id: number, public name: string) {}

  public related: Set<Reference> = new Set<Reference>();
  public articles: Set<Article> = new Set<Article>();

  public url?: string;
  public wikipedia?: string;

  public bandcamp?: string;
  public apple_music?: string;
  public spotify?: string;
  public tidal?: string;
  public discogs?: string;

  public goodreads?: string;

  public static get schema() {
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
}
export class Article {
  constructor(public id: bigint, public markdown: string) {}

  public related: Set<Article> = new Set<Article>();
  public references: Set<Reference> = new Set<Reference>();

  public published?: number;
  public title?: string;

  public static get schema() {
    return [
      new Column("id", "bigint", new Set(["autoincrement"])),
      new Column("markdown", "string"),
      new Column("published", "timestamp", new Set(["null"])),
      new Column("title", "string", new Set(["null"])),
    ];
  }
}
