import { Articles } from "../2/r-articles.tsx";

const ArticleIndex = () => (
  <>
    <h2>Articles</h2>
    <Articles p="/w/article/" w="Drafts" />
    <Articles p="/w/article/" w="Published" />
    <p>
      <a href="/w/article">CREATE</a>.
    </p>
  </>
);

export const Index = () => <ArticleIndex />;
