import { beforeEach, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({
  getSession: vi.fn(),
  setAuth: vi.fn(),
  on: vi.fn(),
  subscribe: vi.fn(),
  removeChannel: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
  db: () => ({
    auth: { getSession: fake.getSession },
    realtime: { setAuth: fake.setAuth },
    channel: () => ({ on: fake.on }),
    removeChannel: fake.removeChannel,
  }),
}));
import { gateway } from "./gateway";
beforeEach(() => {
  vi.clearAllMocks();
  fake.on.mockReturnValue({ subscribe: fake.subscribe });
  fake.setAuth.mockResolvedValue(undefined);
  fake.removeChannel.mockResolvedValue(undefined);
});
it("applies the signed-in session before joining a chat subscription", async () => {
  let finishAuth!: () => void;
  fake.getSession.mockResolvedValue({
    data: { session: { access_token: "test-session" } },
  });
  fake.setAuth.mockImplementation(
    () => new Promise<void>((resolve) => (finishAuth = resolve)),
  );
  const change = vi.fn();
  const stop = gateway.subscribe("messages", "chat_id=eq.chat", change);
  await vi.waitFor(() =>
    expect(fake.setAuth).toHaveBeenCalledWith("test-session"),
  );
  expect(fake.subscribe).not.toHaveBeenCalled();
  finishAuth();
  await vi.waitFor(() => expect(fake.subscribe).toHaveBeenCalledTimes(1));
  fake.subscribe.mock.calls[0][0]("SUBSCRIBED");
  expect(change).toHaveBeenCalledOnce();
  stop();
  expect(fake.removeChannel).toHaveBeenCalledOnce();
});
it("does not join after the chat closes while authentication is loading", async () => {
  let finish!: (value: unknown) => void;
  fake.getSession.mockReturnValue(new Promise((resolve) => (finish = resolve)));
  const stop = gateway.subscribe("messages", undefined, vi.fn());
  stop();
  finish({ data: { session: { access_token: "test-session" } } });
  await Promise.resolve();
  await Promise.resolve();
  expect(fake.subscribe).not.toHaveBeenCalled();
  expect(fake.setAuth).not.toHaveBeenCalled();
});
