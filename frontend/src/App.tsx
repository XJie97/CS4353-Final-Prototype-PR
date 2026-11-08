// Changed: renders AppShell (AppShell.tsx) with the backend from services/backend.ts
// Kept Application() unchanged to prevent merge conflicts
import { AppShell } from "./AppShell";
import { appBackend } from "./services/backend";
import { HelpPage } from "./features/HelpPage";
import { useEffect, useMemo, useState } from "react";
import { AppProvider, useApp } from "./app/context";
import { areFriends } from "./app/domain";
import { parseRoute, type Page, type Route } from "./app/routes";
import BorrowHome from "./pages/borrow/BorrowHome";
import { BottomNavigation } from "./components/BottomNavigation";
import { EmptyState, Header } from "./components/ui/shared";
import { LoansPage } from "./features/LoansPage";
import { LoanForm } from "./features/LoanForm";
import { LockerFlow } from "./features/LockerFlow";
import { ReviewForm } from "./features/ReviewForm";
import { SharePage } from "./features/SharePage";
import { FriendsPage } from "./features/FriendsPage";
import { ProfilePage } from "./features/ProfilePage";
import { ChatsPage } from "./features/ChatsPage";
import { SignIn } from "./features/SignIn";
import { NotificationsPage } from "./features/NotificationsPage";
import "./pages/borrow/borrow.css";
import "./app/app.css";
import { LoanDetails } from "./features/LoanDetails";
export function RouteContent({
  route,
  navigate,
  onItem,
  onHandover,
  onReview,
  onReset,
}: {
  route: Route;
  navigate: (page: Page, id?: string) => void;
  onItem: (id: string) => void;
  onHandover: (id: string) => void;
  onReview: (id: string) => void;
  onReset: () => void;
}) {
  const { store } = useApp();
  switch (route.page) {
    case "loans":
      return route.id ? (
        <LoanDetails
          key={route.id}
          id={route.id}
          onBack={() => navigate("loans")}
          onChat={(peer) => navigate("chats", peer)}
          onHandover={onHandover}
          onReview={onReview}
        />
      ) : (
        <LoansPage
          onOpen={(id) => navigate("loans", id)}
          onHandover={onHandover}
        />
      );
    case "share":
      return /* Render the owner's sharing page and route its loan links to loan details. */ <SharePage onLoan={(id) => navigate("loans", id)} />;
    case "friends":
      return (
        // Render the friends page with conversation and item navigation callbacks.
        <FriendsPage onChat={(id) => navigate("chats", id)} onItem={onItem} />
      );
    case "me":
      return (
        // Render the signed-in profile, resetting its local state when the account changes.
        <ProfilePage
          key={store.activeUserId}
          onLoans={() => navigate("loans")}
          onShare={() => navigate("share")}
          onReset={onReset}
        />
      );
    case "chats":
      return (
        // Render a conversation or conversation list, resetting local state when the peer changes.
        <ChatsPage
          key={route.id ?? "chats"}
          peerId={route.id}
          onOpen={(id) => navigate("chats", id)}
          onLoan={(id) => navigate("loans", id)}
        />
      );
    case "notifications":
      return /* Render notifications with navigation to their related records. */ <NotificationsPage navigate={navigate} />;
    case "borrow":
      return null;
    default:
      return (
        // Provide a recoverable empty state for an unsupported page.
        <main className="app-scroll">
          <EmptyState title="Page not found" text="Choose a section below." />
        </main>
      );
  }
}
function Application() {
  const {
    store,
    loading,
    identity,
    configured,
    storageWarning,
    refresh,
    signOut,
  } = useApp();
  const [help, setHelp] = useState(false);
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(typeof window === "undefined" ? "" : window.location.hash),
  );
  const [homeEpoch, setHomeEpoch] = useState(0);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [handoverId, setHandoverId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  useEffect(() => {
    const handle = () => {
      setRequestId(null);
      setHandoverId(null);
      setReviewId(null);
      setRoute(parseRoute(window.location.hash));
    };
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }, []);
  const catalog = useMemo(
    () =>
      store.items
        .filter((item) => item.listed && item.ownerId !== store.activeUserId)
        .map((item) => ({
          ...item,
          owner: store.people.find((p) => p.id === item.ownerId)?.name,
          isFriend: areFriends(store, store.activeUserId, item.ownerId),
        })),
    [store],
  );
  function navigate(page: Page, id?: string) {
    window.history.pushState(
      null,
      "",
      `#${page}${id ? "/" + encodeURIComponent(id) : ""}`,
    );
    setRoute({ page, ...(id ? { id } : {}) });
    // Delegate an unselected borrow route to the catalog's own navigation.
    if (page === "borrow" && !id) setHomeEpoch((n) => n + 1);
  }
  useEffect(() => {
    setRequestId(null);
    setHandoverId(null);
    setReviewId(null);
    document
      .querySelector<HTMLElement>(".app-header h1")
      ?.focus({ preventScroll: true });
  }, [route.page, route.id]);
  function viewItem(id: string) {
    window.history.pushState(
      { fromFriend: true },
      "",
      `#borrow/item/${encodeURIComponent(id)}`,
    );
    setHomeEpoch((n) => n + 1);
    setRoute({ page: "borrow" });
  }
  const me = store.people.find((p) => p.id === store.activeUserId)!;
  const requestItem = store.items.find((i) => i.id === requestId);
  const title =
    route.page === "loans"
      ? route.id
        ? "Loan Details"
        : "Your Loans"
      : route.page === "share"
        ? "Your Shelf"
        : route.page === "friends"
          ? "Your Friends"
          : route.page === "me"
            ? "Your Profile"
            : route.page === "chats"
              ? route.id
                ? (store.people.find((p) => p.id === route.id)?.name ?? "Chats")
                : "Chats"
              : "Notifications";
  // Show setup instructions when backend credentials are absent.
  if (!configured) return /* Present backend-setup instructions through the shared sign-in screen. */ <SignIn setup />;
  // Show the loading screen until the initial session data arrives.
  if (loading)
    return (
      // Announce initial loading while the community snapshot is being fetched.
      <div className="borrow-app">
        <main className="app-loading" role="status">
          Opening your community…
        </main>
      </div>
    );
  // Show sign-in when no authenticated identity exists.
  if (!identity) return /* Present assigned-account authentication before rendering private pages. */ <SignIn />;
  // Show an account error when the session has no matching profile.
  if (!me)
    return (
      // Explain why the authenticated account cannot load its community profile.
      <div className="borrow-app">
        <main className="app-loading">
          <p role="alert">{storageWarning || "Unable to load your profile."}</p>
          <button className="button" onClick={() => void refresh()}>
            Retry
          </button>
          <button className="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </main>
      </div>
    );
  return (
    // Keep the borrow feature mounted while switching the other application pages.
    <div className="borrow-app">
      <div className="app-feature" hidden={route.page !== "borrow"}>
        <BorrowHome
          key={`${me.id}-${homeEpoch}`}
          embedded
          catalog={catalog}
          onRequest={setRequestId}
          onChat={() => navigate("chats")}
          onNotifications={() => navigate("notifications")}
        />
      </div>
      {route.page !== "borrow" && (
        <>
          <Header
            title={title}
            navigate={navigate}
            onBack={() =>
              navigate(
                route.id && (route.page === "loans" || route.page === "chats")
                  ? route.page
                  : "borrow",
              )
            }
          />
          {route.page !== "friends" && (
            <RouteContent
              route={route}
              navigate={navigate}
              onItem={viewItem}
              onHandover={setHandoverId}
              onReview={setReviewId}
              onReset={() => navigate("borrow")}
            />
          )}
        </>
      )}
      <div className="app-feature" hidden={route.page !== "friends"}>
        <FriendsPage
          active={route.page === "friends"}
          onChat={(id) => navigate("chats", id)}
          onItem={viewItem}
        />
      </div>
      <div className="preview-strip">
        <span>Signed in as {me.name}</span>
        <span>Shared demo</span>
      </div>
      {storageWarning && (
        <div className="storage-warning" role="status">
          {storageWarning} <button onClick={() => void refresh()}>Retry</button>
        </div>
      )}
      {["borrow", "share"].includes(route.page) && (
        <button className="button" onClick={() => setHelp(true)}>
          Ask for help / offers
        </button>
      )}
      {help && (
        <HelpPage
          key={me.id}
          onClose={() => setHelp(false)}
          onLoan={(id) => {
            setHelp(false);
            navigate("loans", id);
          }}
        />
      )}
      <BottomNavigation
        active={
          ["chats", "notifications"].includes(route.page)
            ? "borrow"
            : route.page
        }
        onNavigate={navigate}
      />
      {reviewId && (
        <ReviewForm loanId={reviewId} onClose={() => setReviewId(null)} />
      )}
      {handoverId && (
        <LockerFlow
          key={handoverId}
          loanId={handoverId}
          onClose={() => setHandoverId(null)}
          onDone={() => {
            setHandoverId(null);
            navigate("loans", handoverId);
          }}
        />
      )}
      {requestItem && (
        <LoanForm
          item={requestItem}
          onClose={() => setRequestId(null)}
          onDone={(id) => {
            setRequestId(null);
            navigate("loans", id);
          }}
        />
      )}
    </div>
  );
}
// export default function App(){return <AppProvider><Application/></AppProvider>;}
export default function App() {
  return (
    // Supply shared session, command, and store state to the application.
    <AppProvider backend={appBackend()}>
      <AppShell />
    </AppProvider>
  );
}
