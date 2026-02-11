import { ArticleA } from "../src/article.tsx";
import { dateToLocal } from "../src/dates.ts";
import { useArticle } from "../src/use-article.ts";

export const ReadArticle = () => {
  const { article, references, articles } = useArticle();

  return article.id
    ? (
      <>
        <h1>
          {article.title || "Article #" + String(article.id).padStart(4, "0")}
        </h1>
        <h2>
          {dateToLocal(article.published as Date) || "DRAFT"}
        </h2>

        <pre>{article.words}</pre>

        {references.length > 0 && (
          <>
            <hr />
            <h2>Related References</h2>
            <ul>
              {references.map((r) => (
                <li key={r.id}>
                  <a href={"/r/r/" + r.id}>
                    #{String(r.id).padStart(4, "0")}
                  </a>{" "}
                  {r.name}
                </li>
              ))}
            </ul>
          </>
        )}

        {articles.length > 0 && (
          <>
            <hr />
            <h2>Related Articles</h2>
            <ul>
              {articles.map((a) => (
                <li key={a.id}>
                  <ArticleA prefix="/r/a/" a={a} />
                </li>
              ))}
            </ul>
          </>
        )}
      </>
    )
    : <h1>404 :(</h1>;
};
