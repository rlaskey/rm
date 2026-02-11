import { DraftArticles, PublishedArticles } from "../src/article.tsx";
import { useIndex } from "../src/use-index.ts";

import { References } from "./r-references.tsx";

export const ReadIndex = () => {
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
        prefix="/r/a/"
        {...{ drafts, backDraft, location }}
      />
      <PublishedArticles
        prefix="/r/a/"
        {...{ published, backPublished, location }}
      />

      <hr />

      <References prefix="/r/r/" {...{ references, backReference, location }} />
    </>
  );
};
