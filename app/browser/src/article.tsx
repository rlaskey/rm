import { anArticle, dateToLocal } from "./data.ts";

export const ArticleA = (
  props: { prefix: string; a: Record<string, typeof anArticle.valueType> },
) => (
  <>
    <a href={props.prefix + props.a.id}>
      #{String(props.a.id).padStart(4, "0")}
    </a>
    {props.a.published && " -- " + dateToLocal(props.a.published as Date)}
    {props.a.title && " -- " + props.a.title}
    {props.a.words && " -- " + props.a.words}
  </>
);
