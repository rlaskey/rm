export interface FutureUser {
  id: string; // ulid
  name: string;
}

export interface User {
  id: number | bigint;
  name: string; // Passkeys need a name.
  write: boolean;
}
