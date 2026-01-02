import { kv } from "@/src/kv.ts";
import { Article } from "@/src/f/types.ts";

const KV_KEY: string = "entry";

export const listArticles = (): Deno.KvListIterator<Article[]> =>
  kv.list<Article[]>({ prefix: [KV_KEY] }, {
    limit: 23,
    reverse: true,
  });

export const getArticle = async (id: string): Promise<Article | null> => {
  const result = await kv.get<Article>([KV_KEY, id]);
  if (result.versionstamp === null) return null;
  return result.value;
};

export const setArticle = async (
  entry: Article,
): Promise<Deno.KvCommitResult> => {
  return await kv.set([KV_KEY, entry.id], entry);
};
