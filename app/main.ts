import { App, csp, csrf, staticFiles } from "fresh";
import { bots } from "@/middleware/bots.ts";
import { session } from "@/middleware/session.ts";
import { type State } from "@/src/define.ts";

export const app = new App<State>();

app.use(bots);
app.use(session);
app.use(staticFiles());

app.use(csp());
app.use(csrf());

app.fsRoutes();
