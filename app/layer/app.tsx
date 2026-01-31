export const App = (
  props: { title: string; scripts: string[]; css: string[] },
) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{props.title}</title>
      {props.scripts.map((e) => (
        <script key={e} src={e} type="module">
        </script>
      ))}
      {props.css.map((e) => <link rel="stylesheet" key={e} href={e} />)}
    </head>
  </html>
);
