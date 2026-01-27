export class Reference {
  constructor(public id: number, public name: string) {}

  public related: Set<Reference> = new Set<Reference>();
  public articles: Set<Article> = new Set<Article>();

  public url: string | null = null;
  public wikipedia: string | null = null;

  public bandcamp: string | null = null;
  public apple_music: string | null = null;
  public spotify: string | null = null;
  public tidal: string | null = null;
  public discogs: string | null = null;

  public goodreads: string | null = null;
}

export class Article {
  constructor(public id: number, public markdown: string) {}

  public published: number | null = null;

  public title: string | null = null;

  public related: Set<Article> = new Set<Article>();
  public references: Set<Reference> = new Set<Reference>();
}
