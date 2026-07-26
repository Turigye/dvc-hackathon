type ClientIdOptions = {
  random?: () => number;
  now?: () => number;
  uuid?: (() => string) | undefined;
};

/**
 * LAN previews use HTTP, where Web Crypto is not guaranteed. Scores still
 * need a durable guest identity before an HTTPS deployment exists.
 */
export function createClientId(options: ClientIdOptions = {}) {
  const uuid = "uuid" in options ? options.uuid : globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (uuid) return uuid();

  // Fall back to a v4-shaped UUID rather than a `guest-` string: the database
  // columns are `uuid`, and a non-UUID id fails the insert outright. This keeps
  // guest scores persisting on non-secure origins without a schema change.
  const random = options.random ?? Math.random;
  const hex = (count: number) => Array.from({ length: count }, () => Math.floor(random() * 16).toString(16)).join("");
  const variant = ((Math.floor(random() * 4) + 8) % 16).toString(16);
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant}${hex(3)}-${hex(12)}`;
}
