import { render } from "preact";
import {
  LocationProvider,
  Route,
  Router,
  useLocation,
} from "preact-iso/router";

import { WriteArticle } from "./3/article.tsx";
import { Index } from "./3/index.tsx";

const Header = () => {
  const location = useLocation();

  return (
    <header>
      <nav>
        <menu>
          <li>✏️</li>
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
        <Route path="/w" component={Index} />
        <Route path="/w/article/:id?" component={WriteArticle} />
      </Router>
    </main>
  </LocationProvider>
);

addEventListener("DOMContentLoaded", () => render(<Layer3 />, document.body));
