import ArticleForm from "@/islands/article-form.tsx";

import { authenticatedDefine } from "@/src/define.ts";

export const handler = authenticatedDefine.handlers<
  { id: string; elements: [] }
>({
  GET({ params }) {
    return { data: { id: params.id, elements: [] } };
  },

  POST() {
    // TODO: await req.formData();
    return { data: { id: "", elements: [] } };
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
