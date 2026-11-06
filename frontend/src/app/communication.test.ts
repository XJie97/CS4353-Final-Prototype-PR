import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCommand, type Store, type Command } from "./domain.ts";
import { createSeed } from "./seed.ts";
const env = {
  id: "chat-event",
  now: "2026-10-31T05:00:00Z",
  today: "2026-10-31",
};
const run = (s: Store, c: Command) => applyCommand(s, c, env);
test("local messages notify the intended person and are read only by the recipient", () => {
  let s = run(createSeed(env.today), {
    type: "send-message",
    to: "sarah",
    text: "  Can I collect tomorrow?  ",
  });
  assert.equal(s.messages.at(-1)?.text, "Can I collect tomorrow?");
  assert.ok(s.notices.some((n) => n.to === "sarah" && n.peerId === "eric"));
  s = run(s, { type: "read-thread", peerId: "sarah" });
  assert.equal(s.messages.at(-1)?.read, false);
  s = run(s, { type: "switch-account", id: "sarah" });
  s = run(s, { type: "read-thread", peerId: "eric" });
  assert.equal(s.messages.at(-1)?.read, true);
});
test("messages reject blank/self/unknown recipients and unrelated loan references", () => {
  const s = createSeed(env.today);
  assert.throws(
    () => run(s, { type: "send-message", to: "sarah", text: "  " }),
    /message/i,
  );
  assert.throws(
    () => run(s, { type: "send-message", to: "eric", text: "Hi" }),
    /yourself/i,
  );
  assert.throws(
    () => run(s, { type: "send-message", to: "missing", text: "Hi" }),
    /person/i,
  );
  assert.throws(
    () =>
      run(s, {
        type: "send-message",
        to: "sarah",
        text: "Hi",
        loanId: "demo-active",
      }),
    /participant/i,
  );
});
test("marking notifications read never touches another account", () => {
  let s = createSeed(env.today);
  s = run(s, { type: "send-message", to: "sarah", text: "Hi" });
  s = run(s, { type: "read-notices" });
  assert.ok(s.notices.filter((n) => n.to === "eric").every((n) => n.read));
  assert.ok(s.notices.filter((n) => n.to === "sarah").some((n) => !n.read));
});
