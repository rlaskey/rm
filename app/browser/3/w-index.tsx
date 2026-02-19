import { DraftArticles, PublishedArticles } from "../src/article.tsx";
import { Files } from "../src/files.tsx";
import { References } from "../src/references.tsx";
import { useIndex } from "../src/use-index.ts";

import { Upload } from "./w-index/upload.tsx";

export const WriteIndex = () => {
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
      <Files prefix="/w/f/" {...{ files, backFile, location }} />
      <Upload />

      <hr />

      <DraftArticles prefix="/w/a/" {...{ drafts, backDraft, location }} />
      <PublishedArticles
        prefix="/w/a/"
        {...{ published, backPublished, location }}
      />

      <p>
        <a href="/w/a">Create an Article</a>.
      </p>

      <hr />

      <References prefix="/w/r/" {...{ references, backReference, location }} />
      <p>
        <a href="/w/r">Create a Reference</a>.
      </p>
    </>
  );
};
