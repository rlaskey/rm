import { type LocationHook } from "preact-iso/router";

import { aReference } from "./data.ts";
import { SELECT_LIMIT } from "./site.ts";

export const References = (
  props: {
    prefix: string;
    references: Record<string, typeof aReference.valueType>[];
    backReference: bigint | undefined;
    location: LocationHook;
  },
) => {
  if (!props.references.length) return;

  const goBack = () => {
    const q = { ...props.location.query };
    q["r"] = String(props.backReference);
    props.location.route(
      props.location.path + "?" + (new URLSearchParams(q)).toString(),
    );
  };

  const goForth = () => {
    const q = { ...props.location.query };
    q["r"] = String(props.references[props.references.length - 1].id);
    props.location.route(
      props.location.path + "?" + (new URLSearchParams(q)).toString(),
    );
  };

  return (
    <>
      <h2>References</h2>
      <menu>
        {props.references.slice(0, SELECT_LIMIT).map((r) => (
          <li key={r.id}>
            <a href={props.prefix + r.id}>
              #{String(r.id).padStart(4, "0")}
            </a>{" "}
            {r.name}
          </li>
        ))}
      </menu>
      <p>
        {!!props.backReference && (
          <button type="button" onClick={goBack}>Back</button>
        )}
        {props.references.length > SELECT_LIMIT && (
          <button type="button" onClick={goForth}>Forth</button>
        )}
      </p>
    </>
  );
};
