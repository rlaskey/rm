import { define } from "@/src/define.ts";

import CredentialsCreate from "@/islands/credentials-create.tsx";
import CredentialsGet from "@/islands/credentials-get.tsx";

export default define.page(({ state }) => {
  const authenticated = !!state.session?.user_id;
  const challengeCreated = !!state.session?.data.challenge;

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
