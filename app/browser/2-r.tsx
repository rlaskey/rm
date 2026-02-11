import { render } from "preact";
import {
  LocationProvider,
  Route,
  Router,
  useLocation,
} from "preact-iso/router";

import { ReadArticle } from "./2/r-article.tsx";
import { ReadIndex } from "./2/r-index.tsx";
import { ReadReference } from "./2/r-reference.tsx";

const Header = () => {
  const location = useLocation();

  return (
    <header>
      <nav>
        <menu className="inline">
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
        <Route path="/r" component={ReadIndex} />
        <Route path="/r/a/:id?" component={ReadArticle} />
        <Route path="/r/r/:id?" component={ReadReference} />
      </Router>
    </main>
  </LocationProvider>
);

addEventListener("DOMContentLoaded", () => render(<Layer2 />, document.body));
