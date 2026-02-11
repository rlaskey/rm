import { DraftArticles, PublishedArticles } from "../src/article.tsx";
import { useIndex } from "../src/use-index.ts";

import { References } from "../2/r-references.tsx";

export const WriteIndex = () => {
  const {
    drafts,
    backDraft,
    published,
    backPublished,
    references,
    backReference,
    location,
  } = useIndex();

  return (
    <>
      <DraftArticles
        prefix="/w/article/"
        {...{ drafts, backDraft: backDraft, location }}
      />
      <PublishedArticles
        prefix="/w/article/"
        {...{ published, backPublished, location }}
      />

      <p>
        <a href="/w/article">Create an Article</a>.
      </p>

      <hr />

      <References
        prefix="/w/reference/"
        {...{ references, backReference, location }}
      />
      <p>
        <a href="/w/reference">Create a Reference</a>.
      </p>
    </>
  );
};
