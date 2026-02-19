import { render } from "preact";
import {
  LocationProvider,
  Route,
  Router,
  useLocation,
} from "preact-iso/router";

import { WriteArticle } from "./3/w-article.tsx";
import { WriteFile } from "./3/w-file.tsx";
import { WriteIndex } from "./3/w-index.tsx";
import { WriteReference } from "./3/w-reference.tsx";

const Header = () => {
  const location = useLocation();

  return (
    <header>
      <nav>
        <menu className="inline">
          <li aria-hidden="true">✏️</li>
          <li>
            <a href="/r">Read</a>.
          </li>
          {location.url !== "/w" && (
            <li>
              <a href="/w">Write</a>.
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

const Layer3 = () => (
  <LocationProvider scope="/w">
    <Header />
    <main>
      <Router>
        <Route path="/w" component={WriteIndex} />
        <Route path="/w/f/:id?" component={WriteFile} />
        <Route path="/w/a/:id?" component={WriteArticle} />
        <Route path="/w/r/:id?" component={WriteReference} />
      </Router>
    </main>
  </LocationProvider>
);

addEventListener("DOMContentLoaded", () => render(<Layer3 />, document.body));
