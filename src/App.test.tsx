import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
const fake = vi.hoisted(() => ({
  signIn: vi.fn(),
  actor: { id: null as string | null, email: "", loading: false },
  getItems: vi.fn(),
}));
vi.mock("./features/auth/context", () => ({ useAuth: () => fake.actor }));
vi.mock("./lib/supabase", () => ({ configured: true }));
vi.mock("./core/services", () => ({
  services: {
    auth: { signIn: (...a: unknown[]) => fake.signIn(...a) },
    items: {
      getItems: (...a: unknown[]) => fake.getItems(...a),
      getLockers: async () => [],
    },
    friends: { getFriends: async () => [] },
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  fake.actor = { id: null, email: "", loading: false };
  history.replaceState(null, "", "/borrow");
});
afterEach(cleanup);
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <App />
    </QueryClientProvider>,
  );
}
it("has exactly five pages and keeps login inside them", async () => {
  const u = userEvent.setup();
  mount();
  const nav = within(screen.getByRole("navigation"));
  const buttons = nav.getAllByRole("button");
  // Verify the exact set and order of primary navigation buttons.
  expect(buttons.map((b) => b.textContent)).toEqual([
    "Borrow",
    "Share",
    "Loans",
    "Friends",
    "Me",
  ]);
  for (const name of ["Share", "Loans", "Friends", "Me", "Borrow"]) {
    await u.click(nav.getByRole("button", { name }));
    // Verify that each primary navigation button updates its matching browser route.
    expect(location.pathname).toBe("/" + name.toLowerCase());
    // Verify that unauthenticated navigation shows the sign-in heading.
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
  }
});
it("shows sign-in errors and never offers public signup", async () => {
  fake.signIn.mockRejectedValue(new Error("Invalid login credentials"));
  const u = userEvent.setup();
  mount();
  // Verify that the assigned-account sign-in screen has no self-registration action.
  expect(
    screen.queryByRole("button", { name: /signup|create account/i }),
  ).toBeNull();
  await u.type(screen.getByLabelText("Email"), "alice@cs4353.example.test");
  await u.type(screen.getByLabelText("Password"), "wrong");
  await u.click(screen.getByRole("button", { name: "Sign in" }));
  // Verify that failed authentication is displayed as an accessible alert.
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Invalid login",
  );
});
it("isolates failed Borrow queries from the Share page", async () => {
  fake.actor = { id: "me", email: "demo@example.test", loading: false };
  fake.getItems.mockImplementation(async (f) => {
    // Make the mock reject the general Borrow query while allowing owner-filtered Share queries.
    if (!f.ownerId) throw new Error("Borrow unavailable");
    return [];
  });
  const u = userEvent.setup();
  mount();
  // Verify that a failed Borrow query displays its error before switching pages.
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Borrow unavailable",
  );
  await u.click(
    within(screen.getByRole("navigation")).getByRole("button", {
      name: "Share",
    }),
  );
  // Verify that a successful empty response shows the owned-items empty state.
  expect(await screen.findByText("No owned items.")).toBeTruthy();
  // Verify that the empty owned-items state does not show an error alert.
  expect(screen.queryByRole("alert")).toBeNull();
});
