import { render } from "preact";

import { me, U } from "./2/u.tsx";

const Layer2 = () => {
  return (
    <>
      <header>
        <nav>
          <menu class="inline">
            <li>😁</li>
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
      </header>
      <main>
        <U />
      </main>
    </>
  );
};

addEventListener("DOMContentLoaded", () => render(<Layer2 />, document.body));
