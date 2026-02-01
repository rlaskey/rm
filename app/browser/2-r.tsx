import { render } from "preact";
import {
  LocationProvider,
  Route,
  Router,
  useLocation,
} from "preact-iso/router";

import { ReadArticle } from "./2/r-article.tsx";
import { Index } from "./2/r-articles.tsx";
import { ReadReference } from "./2/r-reference.tsx";

const Header = () => {
  const location = useLocation();

  return (
    <header>
      <nav>
        <menu class="inline">
          <li aria-hidden="true">📖</li>
          {location.url !== "/r" && (
            <li>
              <a href="/r">Read</a>.
            </li>
          )}
          <li>
            <a href="/u">Account</a>.
          </li>
          <li>
            <a href="/logout">Logout</a>.
          </li>
        </menu>
      </nav>
    </header>
  );
};

const Layer2 = () => (
  <LocationProvider scope="/r">
    <Header />
    <main>
      <Router>
        <Route path="/r" component={Index} />
        <Route path="/r/a/:id?" component={ReadArticle} />
        <Route path="/r/r/:id?" component={ReadReference} />
      </Router>
    </main>
  </LocationProvider>
);

addEventListener("DOMContentLoaded", () => render(<Layer2 />, document.body));
