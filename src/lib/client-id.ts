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

  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  return `guest-${now().toString(36)}-${Math.floor(random() * 0xffff_ffff).toString(36)}`;
}
