import { define, SITE_NAME } from "@/src/define.ts";

import CredentialsCreate from "@/islands/credentials-create.tsx";
import CredentialsGet from "@/islands/credentials-get.tsx";

export default define.page((ctx) => {
  const userName = ctx.state.sessionKV?.value.userKV?.value.name || null;
  const challengeCreated = !!ctx.state.sessionKV?.value.authenticating
    ?.challenge;
  const bSession = !!ctx.state.sessionKV;

  return (
    <main>
      <h1>{SITE_NAME + ":🏠"}</h1>

      {!userName
        ? (
          <>
            <CredentialsGet />
            {challengeCreated && <CredentialsCreate />}
          </>
        )
        : (
          <>
            <h2>Welcome, {userName}!</h2>
          </>
        )}

      {bSession && (
        <p>
          <a href="/logout">Logout</a>.
        </p>
      )}
    </main>
  );
});
