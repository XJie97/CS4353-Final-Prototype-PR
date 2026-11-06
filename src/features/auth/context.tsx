import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { services } from "../../core/services";
import { queryClient } from "../../core/query";
import { configured } from "../../lib/supabase";
const Context = createContext<{
  id: string | null;
  email: string;
  loading: boolean;
}>({ id: null, email: "", loading: true });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  useEffect(() => {
    // Skip auth observation when Supabase has not been configured.
    if (!configured) return;
    let previous: string | undefined;
    return services.auth.observe((next) => {
      // Clear cached queries when the authenticated account changes.
      if (previous !== next?.user.id) {
        void queryClient.cancelQueries();
        queryClient.clear();
      }
      previous = next?.user.id;
      setSession(next);
      setLoading(false);
    });
  }, []);
  return (
    // Share the observed auth identity and loading state with descendant features.
    <Context.Provider
      value={{
        id: session?.user.id || null,
        email: session?.user.email || "",
        loading,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
