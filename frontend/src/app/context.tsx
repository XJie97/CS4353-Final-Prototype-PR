import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Command, Store } from "./domain";
import {
  configured,
  services,
  type DemoServices,
  type Identity,
} from "../services/demo";
export const uid = () => crypto.randomUUID();
export type Result = { ok: true } | { ok: false; error: string };
const empty = (): Store => ({
  version: 1,
  activeUserId: "",
  people: [],
  items: [],
  loans: [],
  messages: [],
  friends: [],
  notices: [],
});
type AppContextValue = {
  store: Store;
  loading: boolean;
  storageWarning: string;
  busy: boolean;
  identity: Identity | null;
  configured: boolean;
  perform: (c: Command) => Promise<Result>;
  toast: (text: string) => void;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<AppContextValue | null>(null);
export function AppProvider({
  children,
  initialStore,
  backend,
}: {
  children: ReactNode;
  initialStore?: Store;
  backend?: DemoServices;
}) {
  const [store, setStore] = useState(initialStore ?? empty);
  const current = useRef(store);
  const [identity, setIdentity] = useState<Identity | null>(
    initialStore
      ? { id: initialStore.activeUserId, email: "test@example.test" }
      : null,
  );
  const [loading, setLoading] = useState(!initialStore && configured);
  const [storageWarning, setWarning] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const service = useRef<DemoServices | undefined>(backend);
  const generation = useRef(0);
  const refreshing = useRef<Promise<void> | null>(null);
  const pendingRefresh = useRef(false);
  const mounted = useRef(true);
  const acting = useRef(false);
  const observedId = useRef<string | null | undefined>(undefined);
  const requests = useRef(
    new Map<string, { id: string; revision: number | null }>(),
  );
  const api = () => service.current ?? (service.current = services());
  // Coalesce overlapping refreshes and ignore results from an earlier session.
  async function refresh() {
    // Queue another pass rather than start a second simultaneous refresh.
    if (refreshing.current) {
      pendingRefresh.current = true;
      return refreshing.current;
    }
    const epoch = generation.current;
    const run = (async () => {
      do {
        pendingRefresh.current = false;
        try {
          const next = await api().load();
          // Apply loaded data only while mounted and in the same session generation.
          if (mounted.current && epoch === generation.current) {
            current.current = next;
            setStore(next);
            setWarning("");
          }
        } catch (error) {
          // Show refresh errors only if they still belong to the active session.
          if (mounted.current && epoch === generation.current)
            setWarning(
              error instanceof Error
                ? error.message
                : "Could not load shared data. Try again.",
            );
        }
      } while (
        pendingRefresh.current &&
        mounted.current &&
        epoch === generation.current
      );
    })();
    refreshing.current = run;
    try {
      await run;
    } finally {
      // Clear the refresh handle only if this is still the tracked run.
      if (refreshing.current === run) refreshing.current = null;
      // End initial loading only for the still-mounted, unchanged session.
      if (mounted.current && epoch === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    // Skip live backend observation when a test supplies the initial store.
    if (initialStore)
      return () => {
        mounted.current = false;
      };
    // Avoid creating a backend client without configuration or an injected service.
    if (!configured && !backend) return;
    // Clear account-specific data and retry keys whenever the authenticated user changes.
    const stop = api().observe((next) => {
      const id = next?.id ?? null;
      // Ignore repeated auth events for the same account.
      if (observedId.current === id) return;
      observedId.current = id;
      generation.current++;
      requests.current.clear();
      current.current = empty();
      setStore(empty());
      setWarning("");
      setIdentity(next);
      setLoading(!!next);
      refreshing.current = null;
    });
    return () => {
      mounted.current = false;
      generation.current++;
      stop();
    };
  }, []);
  useEffect(() => {
    // Subscribe only for an authenticated live session, not an injected test store.
    if (!identity || initialStore) return;
    void refresh();
    const stop = api().subscribe(() => void refresh());
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    const timer = setInterval(focus, 5 * 60 * 1000);
    return () => {
      stop();
      window.removeEventListener("focus", focus);
      clearInterval(timer);
    };
  }, [identity?.id]);
  useEffect(() => {
    // Do not schedule dismissal when there is no toast to display.
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  async function perform(command: Command): Promise<Result> {
    // Reject actions during initial loading or another in-flight action.
    if (acting.current || loading)
      return {
        ok: false,
        error: "Please wait for the current action to finish.",
      };
    // Reject writes when nobody is signed in.
    if (!identity) return { ok: false, error: "Sign in to continue." };
    // Require sign-out instead of allowing an in-app account switch.
    if (command.type === "switch-account")
      return { ok: false, error: "Sign out and use your assigned account." };
    // Reuse the request ID and expected revision when retrying the same command.
    const key = JSON.stringify(command);
    let request = requests.current.get(key);
    // Capture a request ID and expected revision on the first attempt.
    if (!request) {
      const c = command as Command & { loanId?: string; id?: string };
      const target = c.loanId || c.id;
      const record = c.loanId
        ? current.current.loans.find((l) => l.id === c.loanId)
        : command.type === "update-profile"
          ? current.current.people.find((p) => p.id === identity.id)
          : current.current.items.find((i) => i.id === target);
      request = { id: uid(), revision: record?.revision ?? null };
      requests.current.set(key, request);
    }
    acting.current = true;
    setBusy(true);
    const epoch = generation.current;
    try {
      await api().execute(command, request.id, request.revision);
      requests.current.delete(key);
      await refresh();
      return epoch === generation.current
        ? { ok: true }
        : {
            ok: false,
            error: "Session changed. Check the saved record after signing in.",
          };
    } catch (error) {
      await refresh();
      const text =
        error instanceof Error
          ? error.message
          : "Could not save. Your changes have not been confirmed.";
      // Keep the same key only for an uncertain transport failure; a server rejection needs a fresh revision.
      // Discard retry metadata after a definite rejection; retain it for uncertain network failures.
      if (!/fetch|network|timeout|connection/i.test(text))
        requests.current.delete(key);
      return { ok: false, error: text };
    } finally {
      acting.current = false;
      // Avoid updating React state after the provider unmounts.
      if (mounted.current) setBusy(false);
    }
  }
  return (
    // Expose shared app actions and render the dismissible toast above page content.
    <Context.Provider
      value={{
        store,
        identity,
        loading,
        storageWarning,
        busy,
        configured: configured || !!backend || !!initialStore,
        perform,
        toast: setMessage,
        refresh,
        signIn: (email, password) => api().signIn(email, password),
        signOut: () => api().signOut(),
      }}
    >
      {children}
      {message && (
        <div className="app-toast" role="status">
          {message}
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useApp() {
  const value = useContext(Context);
  // Report a missing provider instead of returning an unusable context.
  if (!value) throw new Error("AppProvider is required.");
  return value;
}

// For components that also render outside AppProvider (e.g. standalone Borrow screens).
export function useOptionalApp() {
  return useContext(Context);
}
