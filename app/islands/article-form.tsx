import { IS_BROWSER } from "fresh/runtime";

import { Article } from "@/src/f/types.ts";

export default function ArticleForm(props: { article: Article }) {
  if (!IS_BROWSER) return;

  return (
    <form method="POST" name={`form-${props.article.id}`}>
      <textarea required name="markdown" rows={7}>
        {props.article.markdown}
      </textarea>

      <label>
        Title{" "}
        <input type="text" name="title" value={props.article.title || ""} />
      </label>

      <label>
        Published. Clear out to make this a Draft.
        <input type="datetime-local" name="published" />
      </label>

      <button type="submit">Save</button>
    </form>
  );
}
