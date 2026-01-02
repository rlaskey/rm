import { define, SITE_NAME } from "@/src/define.ts";

const EMOJI = ["🏠", "🥳", "🔊"];

export default define.page(({ state, Component }) => (
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{SITE_NAME}</title>
    </head>
    <body>
      <main>
        <h1>
          {SITE_NAME}
          {EMOJI[Math.floor(Math.random() * EMOJI.length)]}
        </h1>
        <Component />
        {!!state.session && (
          <nav>
            <menu>
              {!!state.session.userId && (
                <>
                  {state.session.write && (
                    <li>
                      <a href="/e">Edit</a>.
                    </li>
                  )}
                  <li>
                    <a href="/u">Account</a>.
                  </li>
                </>
              )}
              <li>
                <a href="/logout">Logout</a>.
              </li>
            </menu>
          </nav>
        )}
      </main>
    </body>
  </html>
));
