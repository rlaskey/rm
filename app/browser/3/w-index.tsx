import { Articles } from "../2/r-articles.tsx";
import { References } from "../2/r-references.tsx";

export const Index = () => (
  <>
    <h2>Articles</h2>
    <Articles p="/w/article/" w="Drafts" />
    <Articles p="/w/article/" w="Published" />

    <p>
      <a href="/w/article">Create an Article</a>.
    </p>

    <hr />

    <References p="/w/reference/" />
    <p>
      <a href="/w/reference">Create a Reference</a>.
    </p>
  </>
);
