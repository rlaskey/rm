import { ulid } from "@std/ulid";

export enum ElementType {
  Paragraph = "P",
  Heading = "H",
}

export abstract class Element {
  id: string = ulid();
  abstract type: ElementType;

  toJSON() {
    return { id: this.id, type: this.type };
  }
}

export class Heading extends Element {
  override type = ElementType.Heading;
  level: number = 2;
  contents: string = "";

  override toJSON() {
    return { ...super.toJSON(), level: this.level, contents: this.contents };
  }
}

export class Paragraph extends Element {
  override type = ElementType.Paragraph;
  contents: string = "";

  override toJSON() {
    return { ...super.toJSON(), contents: this.contents };
  }
}

export type Article = {
  id: string; // ulid
  elements: Element[];
  title?: string;
};
