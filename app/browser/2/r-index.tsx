import { DraftArticles, PublishedArticles } from "../src/article.tsx";
import { Files } from "../src/files.tsx";
import { References } from "../src/references.tsx";
import { useIndex } from "../src/use-index.ts";

export const ReadIndex = () => {
  const {
    files,
    backFile,
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
      <Files prefix="/r/f/" {...{ files, backFile, location }} />

      <hr />

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
