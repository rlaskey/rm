import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso/router";

import { aReference, dateToLocal } from "../data.ts";

import { cborDecode } from "../../src/cbor-decode.ts";
import { cborRequestInit } from "../../src/cbor-encode.ts";

export const WriteReference = () => {
  const [reference, setReference] = useState(
    {} as Record<string, typeof aReference.valueType>,
  );
  const [status, setStatus] = useState({ m: "", c: "", d: new Date() });

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
    setStatus({ m: "", c: "", d: new Date() });
    const form = event.currentTarget as HTMLFormElement;

    if (reference.id) {
      const payload = new Map<string, typeof aReference.valueType>();
      aReference.schema.forEach((c) => {
        const element = form.elements.namedItem(c.name) as
          | HTMLFormElement
          | null;
        if (!element) return;

        const now = c.browserToNetwork(element.value) as string | null;
        if (now === reference[c.name]) return;

        payload.set(c.name, now);
      });

      if (!payload.size) {
        setStatus({ m: "Nothing to save.", c: "warning", d: new Date() });
        return;
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
        setStatus({ m: "Saved.", c: "info", d: new Date() });
      }).catch((e: Error) => {
        setStatus({ m: String(e.message || e), c: "error", d: new Date() });
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
          setStatus({ m: String(e.message || e), c: "error", d: new Date() })
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

        <label>
          URL
          <input type="url" name="url" value={reference.url as string} />
        </label>
        <label>
          Wikipedia
          <input
            type="url"
            name="wikipedia"
            value={reference.wikipedia as string}
            pattern=".+wikipedia.+"
            placeholder="https://en.wikipedia.org"
          />
        </label>
        <label>
          Bandcamp
          <input
            type="url"
            name="bandcamp"
            value={reference.bandcamp as string}
            pattern=".+bandcamp.+"
            placeholder="https://bandcamp.com"
          />
        </label>
        <label>
          Apple Music
          <input
            type="url"
            name="apple_music"
            value={reference.apple_music as string}
            pattern=".*music\.apple.+"
            placeholder="https://music.apple.com"
          />
        </label>
        <label>
          Spotify
          <input
            type="url"
            name="spotify"
            value={reference.spotify as string}
          />
        </label>
        <label>
          Tidal
          <input type="url" name="tidal" value={reference.tidal as string} />
        </label>
        <label>
          Discogs
          <input
            type="url"
            name="discogs"
            value={reference.discogs as string}
          />
        </label>
        <label>
          Goodreads
          <input
            type="url"
            name="goodreads"
            value={reference.goodreads as string}
          />
        </label>

        {status.m && (
          <p class={status.c}>{dateToLocal(status.d)} -- {status.m}</p>
        )}

        <p>
          <button type="submit">Save</button>
        </p>
      </form>
    </>
  );
};
