export enum Status {
  Published = "P",
  Draft = "D",
}

export class Reference {
  public status: Status = Status.Draft;
  constructor(public id: string, public name: string) {}

  relatedIds?: Set<string>;
  articleIds?: Set<string>;

  url?: string;
  wikipedia?: string;

  bandcamp?: string;
  appleMusic?: string;
  spotify?: string;
  tidal?: string;
  discogs?: string;

  goodReads?: string;
}

export class Article {
  public status: Status = Status.Draft;
  constructor(public id: string, public markdown: string) {}

  title?: string;
  relatedIds?: Set<string>;
  referenceIds?: Set<string>;
}
