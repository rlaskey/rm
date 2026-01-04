import { kv } from "@/src/kv.ts";
import { Article, Reference, Status } from "@/src/f/types.ts";

const ARTICLE_KEYS = new Map<Status, string>([
  [Status.Published, "published"],
  [Status.Draft, "draft"],
]);
const REFERENCE_KEY: string = "external";
const REFERENCE_SECONDARY_KEY: string[] = ["secondary", REFERENCE_KEY];

// Article
export const listArticles = (
  status: Status,
  start?: string,
): Deno.KvListIterator<Article[]> => {
  const k = ARTICLE_KEYS.get(status);
  if (!k) throw new Error("Invalid Article Status. That's weird.");

  let selector: Deno.KvListSelector = { prefix: [k] };
  if (start) selector = { ...selector, start: [k, start] };
  return kv.list<Article[]>(selector, { limit: 79, reverse: true });
};

export const getPublishedArticle = async (
  id: string,
): Promise<Article | null> => {
  const k = ARTICLE_KEYS.get(Status.Published);
  if (!k) throw new Error("Invalid Article Status. That's weird.");

  const result = await kv.get<Article>([k, id]);
  if (result.versionstamp === null) return null;
  return result.value;
};

export const setArticle = async (
  article: Article,
): Promise<Deno.KvCommitResult> => {
  const k = ARTICLE_KEYS.get(article.status);
  if (!k) throw new Error("Invalid Article Status. That's weird.");

  return await kv.set([k, article.id], article);
};

// Reference
export const listReferences = (
  start?: string,
): Deno.KvListIterator<Reference[]> => {
  let selector: Deno.KvListSelector = { prefix: [REFERENCE_KEY] };
  if (start) selector = { ...selector, start: [REFERENCE_KEY, start] };
  return kv.list<Reference[]>(selector, { limit: 79, reverse: true });
};

export const getReference = async (id: string): Promise<Reference | null> => {
  const result = await kv.get<Reference>([REFERENCE_KEY, id]);
  if (result.versionstamp === null) return null;
  return result.value;
};

export const setReference = async (
  external: Reference,
): Promise<Deno.KvCommitResult> => {
  // TODO secondary index.
  return await kv.set([REFERENCE_KEY, external.id], external);
};
