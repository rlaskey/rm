import { ArticleA } from "../src/article.tsx";
import { useReference } from "../src/use-reference.ts";

export const ReadReference = () => {
  const {
    articles,
    labeledURLs,
    reference,
    references,
  } = useReference();

  return reference.id && (
    <>
      <h1>{reference.name}</h1>

      <ul>
        {labeledURLs.map((u) => (
          <li key={u.id}>
            <a href={u.id as string}>
              {(new URL(u.id as string)).host}
            </a>{" "}
            {u.label}
          </li>
        ))}
      </ul>

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
    </>
  );
};
