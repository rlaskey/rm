import { type LocationHook } from "preact-iso/router";

import { aFile } from "./data.ts";
import { SELECT_LIMIT } from "./site.ts";

export const DisplayFile = (props: Record<string, typeof aFile.valueType>) => {
  const imageCycle = (event: Event) => {
    const e = event.currentTarget as HTMLElement;

    if (e.classList.contains("fill-viewport")) {
      e.classList.remove("fill-viewport");
      e.classList.add("full-bleed");
    } else if (e.classList.contains("full-bleed")) {
      e.classList.remove("full-bleed");
    } else {
      e.classList.add("fill-viewport");
    }
  };

  return props.id && (
    <>
      <h1>
        File{props.id && ": " + String(props.id).padStart(4, "0")}
      </h1>

      <p>
        {(props.content_type as string)?.startsWith("image/")
          ? (
            <img
              className="pointer"
              src={"/2/bytes/" + props.id}
              onClick={imageCycle}
            />
          )
          : <a href={"/2/bytes/" + props.id}>Download</a>}
      </p>
    </>
  );
};

export const Files = (
  props: {
    prefix: string;
    files: Record<string, typeof aFile.valueType>[];
    backFile: bigint | undefined;
    location: LocationHook;
  },
) => {
  if (!props.files.length) return;

  const goBack = () => {
    const q = { ...props.location.query };
    q["f"] = String(props.backFile);
    props.location.route(
      props.location.path + "?" + (new URLSearchParams(q)).toString(),
    );
  };

  const goForth = () => {
    const q = { ...props.location.query };
    q["f"] = String(props.files[props.files.length - 1].id);
    props.location.route(
      props.location.path + "?" + (new URLSearchParams(q)).toString(),
    );
  };

  return (
    <>
      <h2>Files</h2>
      <menu>
        {props.files.slice(0, SELECT_LIMIT).map((f) => (
          <li key={f.id}>
            <a href={props.prefix + f.id}>
              #{String(f.id).padStart(4, "0")}
            </a>{" "}
            {f.content_type && " -- " + f.content_type}
            {f.title && " -- " + f.title}
          </li>
        ))}
      </menu>
      <p>
        {!!props.backFile && (
          <button type="button" onClick={goBack}>Back</button>
        )}
        {props.files.length > SELECT_LIMIT && (
          <button type="button" onClick={goForth}>Forth</button>
        )}
      </p>
    </>
  );
};
