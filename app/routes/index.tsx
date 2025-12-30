import { define } from "@/src/define.ts";

import CredentialsCreate from "@/islands/credentials-create.tsx";
import CredentialsGet from "@/islands/credentials-get.tsx";

export default define.page(({ state }) => {
  const userName = state.sessionKV?.value.userKV?.value.name || null;
  const challengeCreated = !!state.sessionKV?.value.authenticating
    ?.challenge;

  const Login = () => (
    <>
      <CredentialsGet />
      {challengeCreated && <CredentialsCreate />}
    </>
  );

  const Welcome = () => (
    <>
      <h2>🥳</h2>
    </>
  );

  return (
    <>
      {!userName ? <Login /> : <Welcome />}
    </>
  );
});
