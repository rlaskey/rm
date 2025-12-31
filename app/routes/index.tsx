import { define } from "@/src/define.ts";

import CredentialsCreate from "@/islands/credentials-create.tsx";
import CredentialsGet from "@/islands/credentials-get.tsx";

export default define.page(({ state }) => {
  const authenticated = !!state.session?.userId;
  const challengeCreated = !!state.session?.challenge;

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
      {authenticated ? <Welcome /> : <Login />}
    </>
  );
});
