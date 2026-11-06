// Each client gets its own BroadcastChannel, while tokens retain a stable,
// tab-scoped sessionStorage location across reloads (including duplicated tabs).
const sessionKey = "cs4353-connected-auth";
export function tabAuthOptions(
  storage?: Storage,
  channelId = crypto.randomUUID(),
) {
  const storageKey = `${sessionKey}:${channelId}`;
  const storedKey = (key: string) => sessionKey + key.slice(storageKey.length);
  return {
    storageKey,
    storage: storage
      ? {
          getItem: (key: string) => storage.getItem(storedKey(key)),
          setItem: (key: string, value: string) =>
            storage.setItem(storedKey(key), value),
          removeItem: (key: string) => storage.removeItem(storedKey(key)),
        }
      : undefined,
    persistSession: !!storage,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  };
}
