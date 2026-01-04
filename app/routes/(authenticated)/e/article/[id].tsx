import ArticleForm from "@/islands/article-form.tsx";

import { authenticatedDefine } from "@/src/define.ts";
import { Article } from "@/src/f/types.ts";

export const handler = authenticatedDefine.handlers<Article>({
  GET({ params }) {
    return { data: new Article(params.id, "") };
  },

  POST() {
    // TODO: await req.formData();
    return { data: new Article("??", "??") };
  },
});

export default authenticatedDefine.page<typeof handler>(({ data }) => {
  return (
    <>
      <h2>Article</h2>

      <ArticleForm article={data} />
    </>
  );
});
