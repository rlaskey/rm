import { State } from "./state.ts";

export class Context {
  constructor(public readonly req: Request) {
    this.url = new URL(req.url);
  }

  public readonly url: URL;

  public res: Response = new Response(null, { status: 404 });
  public state: State = { session: undefined, user: undefined };
}

export type Middleware = (
  ctx: Context,
  next: () => Promise<void>,
) => Promise<void> | void;

export const compose = (middleware: Middleware[]) => (ctx: Context) => {
  const dispatch = (i: number) => async () => {
    if (i < middleware.length) await middleware[i](ctx, dispatch(i + 1));
  };
  return dispatch(0)();
};
