import { PAGES, navigate, useRoute } from "./core/router";
import { useAuth } from "./features/auth/context";
import { SignIn } from "./features/auth/SignIn";
import { configured } from "./lib/supabase";
import BorrowPage from "./pages/BorrowPage";
import SharePage from "./pages/SharePage";
import LoansPage from "./pages/LoansPage";
import FriendsPage from "./pages/FriendsPage";
import MePage from "./pages/MePage";
import { useQueryClient } from "@tanstack/react-query";
export default function App() {
  const route = useRoute();
  const auth = useAuth();
  const cache = useQueryClient();
  return (
    <>
      <header>
        <h1>CS4353 prototype</h1>
        <span>{auth.email || "Signed out"}</span>
        {auth.id && (
          <button onClick={() => void cache.invalidateQueries()}>
            Refresh
          </button>
        )}
      </header>
      <nav aria-label="Main navigation">
        {PAGES.map((page) => (
          <button
            key={page}
            aria-current={route.page === page ? "page" : undefined}
            onClick={() => navigate(page)}
          >
            {page[0].toUpperCase() + page.slice(1)}
          </button>
        ))}
      </nav>
      <main>
        {!configured ? (
          <p role="alert">
            Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in
            .env and restart.
          </p>
        ) : auth.loading ? (
          <p>Loading session…</p>
        ) : !auth.id ? (
          <SignIn />
        ) : route.page === "borrow" ? (
          <BorrowPage />
        ) : route.page === "share" ? (
          <SharePage />
        ) : route.page === "loans" ? (
          <LoansPage loanId={route.loanId} />
        ) : route.page === "friends" ? (
          <FriendsPage />
        ) : (
          <MePage />
        )}
      </main>
    </>
  );
}
