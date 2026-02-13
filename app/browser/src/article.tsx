import { type LocationHook } from "preact-iso/router";

import { anArticle } from "./data.ts";
import { dateToLocal } from "./dates.ts";
import { SELECT_LIMIT } from "./site.ts";

export const ArticleA = (
  props: { prefix: string; a: Record<string, typeof anArticle.valueType> },
) => (
  <>
    <a href={props.prefix + props.a.id}>
      #{String(props.a.id).padStart(4, "0")}
    </a>
    {props.a.published &&
      " -- " + dateToLocal(props.a.published as Date).replace("T", " ")}
    {props.a.title && " -- " + props.a.title}
    {props.a.words && " -- " + props.a.words}
  </>
);

export const PublishedArticles = (
  props: {
    prefix: string;
    published: Record<string, typeof anArticle.valueType>[];
    backPublished: [bigint, bigint] | undefined;
    location: LocationHook;
  },
) => {
  if (!props.published.length) return;

  const goBack = () => {
    const q = { ...props.location.query };
    if (!props.backPublished) return;
    q["pPublished"] = String(props.backPublished[0]);
    q["pID"] = String(props.backPublished[1]);
    props.location.route(
      props.location.path + "?" + (new URLSearchParams(q)).toString(),
    );
  };

  const goForth = () => {
    const q = { ...props.location.query };
    const last = props.published[props.published.length - 1];
    q["pPublished"] = String(
      Math.floor((last.published as Date).getTime() / 1000),
    );
    q["pID"] = String(last.id);
    props.location.route(
      props.location.path + "?" + (new URLSearchParams(q)).toString(),
    );
  };

  return (
    <>
      <h2>Articles: Published</h2>
      <menu>
        {props.published.slice(0, SELECT_LIMIT).map((a) => (
          <li key={a.id}>
            <ArticleA prefix={props.prefix} a={a} />
          </li>
        ))}
      </menu>
      <p>
        {!!props.backPublished && (
          <button type="button" onClick={goBack}>Back</button>
        )}
        {props.published.length > SELECT_LIMIT && (
          <button type="button" onClick={goForth}>Forth</button>
        )}
      </p>
    </>
  );
};

export const DraftArticles = (
  props: {
    prefix: string;
    drafts: Record<string, typeof anArticle.valueType>[];
    backDraft: bigint;
    location: LocationHook;
  },
) => {
  if (!props.drafts.length) return;

  const goBack = () => {
    const q = { ...props.location.query };
    q["d"] = String(props.backDraft);
    props.location.route(
      props.location.path + "?" + (new URLSearchParams(q)).toString(),
    );
  };

  const goForth = () => {
    const q = { ...props.location.query };
    q["d"] = String(props.drafts[props.drafts.length - 1].id);
    props.location.route(
      props.location.path + "?" + (new URLSearchParams(q)).toString(),
    );
  };

  return (
    <>
      <h2>Articles: Drafts</h2>
      <menu>
        {props.drafts.slice(0, SELECT_LIMIT).map((a) => (
          <li key={a.id}>
            <ArticleA prefix={props.prefix} a={a} />
          </li>
        ))}
      </menu>
      <p>
        {props.backDraft > 0n && (
          <button type="button" onClick={goBack}>Back</button>
        )}
        {props.drafts.length > SELECT_LIMIT && (
          <button type="button" onClick={goForth}>Forth</button>
        )}
      </p>
    </>
  );
};
