import { anArticle, aReference } from "../../src/data.ts";

import { LinkArticles } from "./link-articles.tsx";
import { LinkReferences } from "./link-references.tsx";

export const Links = (props: {
  referenceId: number;
  articles: Record<string, typeof anArticle.valueType>[];
  references: Record<string, typeof aReference.valueType>[];
}) => (
  <>
    <LinkArticles referenceId={props.referenceId} articles={props.articles} />
    <hr />
    <LinkReferences
      referenceId={props.referenceId}
      references={props.references}
    />
  </>
);
