import test from "node:test";
import assert from "node:assert/strict";
import { tabAuthOptions } from "../services/auth.ts";
function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (i) => [...values.keys()][i] ?? null,
    get length() {
      return values.size;
    },
  };
}
test("auth channels differ even when tabs inherit the same session; reload retains tokens", () => {
  const storage = memoryStorage();
  const first = tabAuthOptions(storage);
  const reload = tabAuthOptions(storage);
  // Verify that separate auth channels use different storage keys.
  assert.notEqual(first.storageKey, reload.storageKey);
  first.storage!.setItem(first.storageKey, "original session");
  // Verify that a reload can still read the tab's stored session.
  assert.equal(reload.storage!.getItem(reload.storageKey), "original session");
  first.storage!.setItem(first.storageKey + "-code-verifier", "verifier");
  // Verify that the tab's PKCE verifier is retained with its session.
  assert.equal(
    reload.storage!.getItem(reload.storageKey + "-code-verifier"),
    "verifier",
  );
  const other = tabAuthOptions(memoryStorage());
  other.storage!.setItem(other.storageKey, "other account");
  reload.storage!.removeItem(reload.storageKey);
  // Verify that signing out removes the first tab's stored session.
  assert.equal(first.storage!.getItem(first.storageKey), null);
  // Verify that clearing one session does not erase another account's storage.
  assert.equal(other.storage!.getItem(other.storageKey), "other account");
});
