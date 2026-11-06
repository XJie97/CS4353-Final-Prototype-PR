import { useState } from "react";
import { useApp } from "../app/context";
export function SignIn({ setup = false }: { setup?: boolean }) {
  const { signIn } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="borrow-app">
      <header className="app-header">
        <h1>Community lending</h1>
      </header>
      <main className="app-scroll">
        <section className="preview-controls">
          <h2>{setup ? "Demo setup required" : "Sign in"}</h2>
          {setup ? (
            <p role="alert">
              Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY,
              then rebuild this deployment.
            </p>
          ) : (
            <form
              className="editor-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                setBusy(true);
                setError("");
                try {
                  await signIn(email.trim(), password);
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not sign in.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p>
                Use your assigned Eric, Sarah, Ben or Maya demo login. Changes
                are shared with other testers.
              </p>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  required
                  autoComplete="username"
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  required
                  autoComplete="current-password"
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button primary wide"
                disabled={busy}
                type="submit"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
