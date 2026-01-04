import { authenticatedDefine } from "@/src/define.ts";

export default authenticatedDefine.page(() => {
  // TODO: actually list things
  //
  // import { listArticles } from "@/src/data.ts";
  // const entries = [];
  // for await (const article of listArticles()) entries.push(article.value);

  return (
    <>
      <h2>Entries</h2>

      <p>
        <a href="/e/article">Create</a>.
      </p>

      <p class="warning">TODO: a list of recent entries.</p>
    </>
  );
});
