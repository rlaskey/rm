import { App, csp, csrf, staticFiles } from "fresh";
import { bots } from "@/middleware/bots.ts";
import { type State } from "@/utils.ts";

export const app = new App<State>();

app.use(staticFiles());
app.use(bots);

app.use(csp());
app.use(csrf());

app.fsRoutes();
