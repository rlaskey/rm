import { render } from "preact";
import { useState } from "preact/hooks";

const Layer3 = () => {
  const [markdown, setMarkdown] = useState("");
  const [title, setTitle] = useState("");

  const submit = (e: Event) => {
    e.preventDefault();
  };

  return (
    <>
      <h1>✏️</h1>
      <h2>Article</h2>
      <form onSubmit={submit}>
        <textarea required name="markdown" rows={7}>
          {markdown}
        </textarea>

        <label>
          Title <input type="text" name="title" value={title} />
        </label>

        <label>
          Published. Clear out to make this a Draft.
          <input type="datetime-local" name="published" />
        </label>

        <button type="submit">Save</button>
      </form>

      <nav>
        <menu>
          <li>
            <a href="/u">Account</a>.
          </li>
          <li>
            <a href="/logout">Logout</a>.
          </li>
        </menu>
      </nav>
    </>
  );
};

addEventListener("DOMContentLoaded", () => render(<Layer3 />, document.body));
