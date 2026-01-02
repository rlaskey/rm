import { IS_BROWSER } from "fresh/runtime";
import { useState } from "preact/hooks";

import { Article, Element, Heading, Paragraph } from "@/src/f/types.ts";

class Editable {
  element: Element;
  deleted: boolean;

  constructor(element: Element) {
    this.element = element;
    this.deleted = false;
  }
}

type Props = {
  article: Article;
};

export default function ArticleForm(props: Props) {
  const [editables, setEditables] = useState<Editable[]>(
    props.article.elements.map((e) => new Editable(e)),
  );

  if (!IS_BROWSER) return;

  const addP = () =>
    setEditables([...editables, new Editable(new Paragraph())]);
  const addH = () => setEditables([...editables, new Editable(new Heading())]);

  const mv = (i: number, direction: -1 | 1): void => {
    const result: Editable[] = [...editables];
    [result[i], result[i + direction]] = [result[i + direction], result[i]];
    setEditables(result);
  };

  return (
    <form method="POST">
      {editables.map((e, i) => (
        <section key={e.element.id}>
          {i > 0 && <span class="pointer" onClick={() => mv(i, -1)}>⬆️</span>}
          {i < editables.length - 1 && (
            <span
              class="pointer"
              onClick={() => mv(i, 1)}
            >
              ⬇️
            </span>
          )}
          {e.element.type === "H" &&
            (
              <h2 contentEditable="plaintext-only">
                !!{e.element.type}!{e.element}
              </h2>
            )}
          {e.element.type === "P" &&
            (
              <p contentEditable="plaintext-only">
                !!{e.element.type}!{e.element}
              </p>
            )}
        </section>
      ))}

      <p>
        <button type="button" onClick={addP}>+ Paragraph</button>
        <button type="button" onClick={addH}>+ Heading</button>
      </p>

      <label>
        Title
        <input type="text" name="title" value={props.article.title} />
      </label>

      <button type="submit">Save</button>
    </form>
  );
}
