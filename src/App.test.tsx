import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import App from "./App";

const fake = vi.hoisted(() => ({
  session: null as unknown,
  listener: null as null | ((event: string, session: unknown) => void),
  insert: vi.fn(),
  single: vi.fn(),
  rpc: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  reload: vi.fn(),
  data: {} as Record<string, unknown>,
}));
vi.mock("./lib/data", async (original) => {
  const actual = await original<typeof import("./lib/data")>();
  return { ...actual, useData: () => fake.data };
});
vi.mock("./lib/supabase", () => {
  const builder = {
    select: () => builder,
    limit: () => Promise.resolve({ data: [], error: null }),
    insert: (value: unknown) => {
      fake.insert(value);
      return builder;
    },
    single: () => fake.single(),
  };
  const client = {
    from: () => builder,
    rpc: (...args: unknown[]) => fake.rpc(...args),
    auth: {
      onAuthStateChange: (callback: typeof fake.listener) => {
        fake.listener = callback;
        callback?.("INITIAL_SESSION", fake.session);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signInWithPassword: (...args: unknown[]) => fake.signIn(...args),
      signUp: (...args: unknown[]) => fake.signUp(...args),
    },
  };
  return { configured: true, supabase: client, db: () => client };
});

const user = { id: "owner", email: "owner@example.test" };
const profile = {
  id: "owner",
  display_name: "Alice",
  username: "alice",
  sprite_id: "s1",
  avatar_path: null,
};
const item = {
  id: "i1",
  owner_id: "owner",
  name: "Camera",
  description: "With charger",
  sprite_id: "s2",
  compliments: [],
  status: "available",
};
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
beforeEach(() => {
  vi.clearAllMocks();
  fake.session = null;
  fake.listener = null;
  fake.reload.mockResolvedValue(undefined);
  fake.single.mockResolvedValue({ data: item, error: null });
  fake.rpc.mockResolvedValue({
    data: null,
    error: { code: "23P01", message: "overlap" },
  });
  fake.data = {
    profiles: [profile],
    items: [],
    loans: [],
    friends: [],
    chats: [],
    locations: [],
    sprites: [],
    images: [],
    loading: false,
    error: "",
    reload: fake.reload,
  };
});
afterEach(cleanup);

describe("authentication and connected forms", () => {
  it("keeps private pages behind sign-in and validates missing signup fields", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "My loans" }));
    expect(screen.getByText("A space for your circle")).toBeTruthy();
    await u.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Sign in",
      }),
    );
    await u.click(screen.getByRole("button", { name: "Create an account" }));
    await u.click(screen.getByRole("button", { name: "Create account" }));
    expect(fake.signUp).not.toHaveBeenCalled();
  });

  it("shows a rejected sign-in without dismissing the form", async () => {
    fake.signIn.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Sign in" }));
    const d = within(screen.getByRole("dialog"));
    await u.type(d.getByLabelText("Email"), "owner@example.test");
    await u.type(d.getByLabelText("Password"), "wrong-password");
    await u.click(d.getByRole("button", { name: "Sign in" }));
    expect(await d.findByRole("alert")).toHaveProperty(
      "textContent",
      "Invalid login credentials",
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("saves a signed-in user’s item through the database client", async () => {
    fake.session = { user };
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Add to your shelf" }));
    const d = within(screen.getByRole("dialog"));
    await u.type(d.getByLabelText("Item name"), "Camera");
    await u.type(d.getByLabelText("Description"), "With charger");
    await u.click(d.getByRole("button", { name: "Add to my shelf" }));
    expect(fake.insert).toHaveBeenCalledWith({
      name: "Camera",
      description: "With charger",
    });
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      "Item added to your shelf.",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("uses the auth listener after sign-in without refetching through a stale session", async () => {
    fake.signIn.mockImplementation(async () => {
      fake.listener?.("SIGNED_IN", { user });
      return { data: { session: { user } }, error: null };
    });
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Sign in" }));
    const d = within(screen.getByRole("dialog"));
    await u.type(d.getByLabelText("Email"), "owner@example.test");
    await u.type(d.getByLabelText("Password"), "test-password");
    await u.click(d.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      "Welcome back.",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Add to your shelf" }),
    ).toBeTruthy();
    expect(fake.reload).not.toHaveBeenCalled();
  });

  it("guides unconfirmed signups to email confirmation and keeps the sign-in form", async () => {
    fake.signUp.mockResolvedValue({
      data: { user, session: null },
      error: null,
    });
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Create your account" }));
    const d = within(screen.getByRole("dialog"));
    await u.type(d.getByLabelText("Your name"), "Alice");
    await u.type(d.getByLabelText("Email"), "owner@example.test");
    await u.type(d.getByLabelText("Password"), "test-password");
    await u.click(d.getByRole("button", { name: "Create account" }));
    expect((await d.findByRole("status")).textContent).toContain(
      "check your email",
    );
    expect(d.getByRole("heading", { name: "Welcome back" })).toBeTruthy();
    expect(fake.reload).not.toHaveBeenCalled();
  });

  it("keeps the booking form open and explains a server-side date collision", async () => {
    fake.session = { user };
    fake.data.items = [item];
    fake.data.profiles = [profile, { id: "friend", display_name: "Bob" }];
    fake.data.friends = [
      {
        id: "f1",
        requester_id: "owner",
        recipient_id: "friend",
        status: "accepted",
      },
    ];
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Create loan" }));
    const d = within(screen.getByRole("dialog"));
    await u.selectOptions(d.getByLabelText("Borrower"), "friend");
    await u.click(d.getByRole("button", { name: "Create loan" }));
    expect((await d.findByRole("alert")).textContent).toContain(
      "dates overlap",
    );
    expect(fake.rpc).toHaveBeenCalledWith(
      "start_loan",
      expect.objectContaining({ target_item: "i1", borrower: "friend" }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
