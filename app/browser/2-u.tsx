import { render } from "preact";

import { me, U } from "./2/u.tsx";

const Layer2 = () => {
  return (
    <>
      <h1>👋🏷️</h1>
      <U />
      <nav>
        <menu>
          {me.value.write && (
            <li>
              <a href="/w">Write</a>.
            </li>
          )}
          <li>
            <a href="/logout">Logout</a>.
          </li>
        </menu>
      </nav>
    </>
  );
};

addEventListener("DOMContentLoaded", () => render(<Layer2 />, document.body));
