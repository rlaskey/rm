import { IS_BROWSER } from "fresh/runtime";

import { Article, Status } from "@/src/f/types.ts";

export default function ArticleForm(props: { article: Article }) {
  if (!IS_BROWSER) return;

  return (
    <form method="POST" name={`form-${props.article.id}`}>
      <textarea required name="markdown" rows={7}>
        {props.article.markdown}
      </textarea>

      <label>
        Title <input type="text" name="title" value={props.article.title} />
      </label>

      <label>
        Status
        <select
          name="status"
          defaultValue={Status.Draft}
          value={props.article.status}
        >
          {Object.entries(Status).map(([k, v]) => (
            <option key={v} value={v}>{k}</option>
          ))}
        </select>
      </label>

      <button type="submit">Save</button>
    </form>
  );
}
