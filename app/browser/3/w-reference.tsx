import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborRequestInit } from "../../src/cbor-encode.ts";

import { aReference } from "../src/data.ts";
import { Status, statusState } from "../src/status.tsx";

import { LabeledURLs } from "./w-reference/url.tsx";

const LinkArticles = () => {
  const [results, setResults] = useState([]);

  const search = (event: Event) => {
    event.preventDefault();

    setResults([]);
    const search = ((event.currentTarget as HTMLFormElement).elements.namedItem(
      "search",
    ) as HTMLInputElement).value;
    if (!search) return;
  };

  return (
    <>
      <h3>Articles</h3>

      <form onSubmit={search}>
        <label>
          Search
          <input type="search" name="search" placeholder="SOON" />
        </label>
      </form>

      {results.map((e) => <p key={e}>{e}</p>)}
    </>
  );
};

const Links = () => (
  <>
    <h2>Links</h2>
    <LinkArticles />
  </>
);

export const WriteReference = () => {
  const [reference, setReference] = useState(
    {} as Record<string, typeof aReference.valueType>,
  );
  const [status, setStatus] = useState(statusState());

  const location = useLocation();
  const route = useRoute();

  useEffect(() => {
    if (route.params.id) {
      fetch("/2/reference/" + String(BigInt(route.params.id))).then(
        async (res) =>
          setReference(
            aReference.networkToState(cborDecode(await res.bytes())) as Record<
              string,
              typeof aReference.valueType
            >,
          ),
      );
    }
  }, [location.url]);

  const submit = (event: Event) => {
    event.preventDefault();
    setStatus(statusState(""));
    const form = event.currentTarget as HTMLFormElement;

    if (reference.id) {
      const payload = new Map<string, typeof aReference.valueType>();
      aReference.schema.forEach((c) => {
        const element = form.elements.namedItem(c.name) as
          | HTMLFormElement
          | null;
        if (!element) return;

        const n = c.browserToNetwork(element.value) as string | null;
        if (n === reference[c.name]) return;

        payload.set(c.name, n);
      });

      if (!payload.size) {
        return setStatus(statusState("Nothing to save.", "warning"));
      }

      fetch(
        "/3/reference/" + String(BigInt(reference.id as number | bigint)),
        cborRequestInit(payload),
      ).then(async (res) => {
        if (!res.ok) throw new Error(await res.text() || "Save failed.");
        setReference(
          aReference.networkToState(cborDecode(await res.bytes())) as Record<
            string,
            typeof aReference.valueType
          >,
        );
        setStatus(statusState("Saved."));
      }).catch((e: Error) => {
        setStatus(statusState(String(e.message || e), "error"));
      });
    } else {
      const payload = new Map<string, string | bigint | null>();
      aReference.schema.forEach((c) => {
        const element = form.elements.namedItem(c.name) as
          | HTMLFormElement
          | null;
        if (element) payload.set(c.name, c.browserToNetwork(element.value));
      });

      fetch("/3/reference", cborRequestInit(payload))
        .then(async (res) => {
          const d = cborDecode(await res.bytes()) as number | bigint;
          location.route("/w/reference/" + d);
        }).catch((e) =>
          setStatus(statusState(String(e.message || e), "error"))
        );
    }
  };

  return (
    <>
      <h1>Reference{reference.id && "/" + reference.id}</h1>
      <form onSubmit={submit}>
        <label>
          Name
          <input
            type="text"
            required
            name="name"
            value={reference.name as string}
          />
        </label>

        <Status {...status} />
        <p>
          <button type="submit">Save</button>
        </p>
      </form>

      {reference.id && (
        <>
          <hr />
          <LabeledURLs referenceId={String(reference.id)} />
          <hr />
          <Links />
        </>
      )}
    </>
  );
};
