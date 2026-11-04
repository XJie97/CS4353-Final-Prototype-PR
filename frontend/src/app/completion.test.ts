import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCommand, type Command, type Store } from "./domain.ts";
import { createSeed } from "./seed.ts";
import { decodeStore } from "./storage.ts";
const env = { id: "event", now: "2026-11-04T12:00:00Z", today: "2026-11-04" };
const post: Command = {
  type: "post-help",
  id: "help",
  title: "Cake stand",
  description: "For a birthday",
  start: "2026-12-20",
  end: "2026-12-22",
};
function fixture() {
  let s = applyCommand(createSeed(env.today), post, env);
  s = applyCommand(s, { type: "switch-account", id: "sarah" }, env);
  return applyCommand(
    s,
    {
      type: "offer-help",
      id: "offer",
      requestId: "help",
      itemId: "cake-stand",
    },
    env,
  );
}
test("v1 additive migration preserves existing records and rejects malformed extension", () => {
  const old = createSeed(env.today);
  delete old.helpRequests;
  delete old.offers;
  const restored = decodeStore(JSON.stringify(old))!;
  assert.deepEqual(restored.loans, old.loans);
  assert.deepEqual(restored.people, old.people);
  assert.deepEqual(restored.helpRequests, []);
  assert.equal(decodeStore(JSON.stringify({ ...old, offers: [{}] })), null);
});
test("help offer selection creates ordinary loan once and survives serialization", () => {
  let s = fixture();
  s = applyCommand(s, { type: "switch-account", id: "eric" }, env);
  const choose: Command = {
    type: "select-offer",
    id: "offer",
    loanId: "chosen",
    lockerId: "clementi",
  };
  s = applyCommand(s, choose, env);
  assert.equal(s.loans.find((l) => l.id === "chosen")?.status, "requested");
  assert.equal(s.helpRequests![0].status, "selected");
  assert.ok(decodeStore(JSON.stringify(s)));
  assert.throws(() => applyCommand(s, choose, env));
});
test("help rejects wrong roles, duplicate, expired and reversed requests", () => {
  const s = fixture();
  assert.throws(() => applyCommand(s, { type: "close-help", id: "help" }, env));
  assert.throws(() =>
    applyCommand(
      s,
      { type: "select-offer", id: "offer", loanId: "x", lockerId: "clementi" },
      env,
    ),
  );
  assert.throws(() =>
    applyCommand(
      s,
      {
        type: "offer-help",
        id: "duplicate",
        requestId: "help",
        itemId: "cake-stand",
      },
      env,
    ),
  );
  assert.throws(() =>
    applyCommand(s, { ...post, id: "bad", end: "2026-12-01" }, env),
  );
  assert.throws(() =>
    applyCommand(s, { ...post, id: "bad", start: "2020-01-01" }, env),
  );
});
test("withdrawal, closure and intervening bookings prevent selection", () => {
  let s = fixture();
  s = applyCommand(s, { type: "withdraw-offer", id: "offer" }, env);
  s = applyCommand(s, { type: "switch-account", id: "eric" }, env);
  assert.throws(() =>
    applyCommand(
      s,
      { type: "select-offer", id: "offer", loanId: "x", lockerId: "clementi" },
      env,
    ),
  );
  s = applyCommand(s, { type: "close-help", id: "help" }, env);
  assert.equal(s.helpRequests![0].status, "closed");
  s = fixture();
  s = applyCommand(s, { type: "switch-account", id: "eric" }, env);
  s = applyCommand(
    s,
    {
      type: "request-loan",
      id: "booked",
      itemId: "cake-stand",
      start: "2026-12-20",
      end: "2026-12-22",
      lockerId: "clementi",
    },
    env,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        {
          type: "select-offer",
          id: "offer",
          loanId: "x",
          lockerId: "clementi",
        },
        env,
      ),
    /overlap/,
  );
});
test("multiple offers remain separate until borrower selection", () => {
  let s = fixture();
  s = applyCommand(
    s,
    {
      type: "offer-help",
      id: "offer2",
      requestId: "help",
      itemId: "cake-large",
    },
    env,
  );
  assert.equal(s.offers!.length, 2);
  assert.equal(s.helpRequests![0].status, "open");
});
test("review edits enforce author ownership and retain completion through reload", () => {
  let s = createSeed(env.today);
  const l = s.loans.find((l) => l.status === "complete")!;
  s.activeUserId = l.borrowerId;
  l.review = { rating: 5, text: "Original", compliments: [], at: env.now };
  const c: Command = {
    type: "edit-review",
    loanId: l.id,
    rating: 4,
    text: "Updated",
    compliments: ["As described"],
  };
  s = applyCommand(s, c, env);
  assert.equal(s.loans.find((v) => v.id === l.id)!.status, "complete");
  assert.equal(
    decodeStore(JSON.stringify(s))!.loans.find((v) => v.id === l.id)!.review!
      .text,
    "Updated",
  );
  s.activeUserId = l.ownerId;
  assert.throws(() => applyCommand(s, c, env));
});
test("counterproposal stores immediate previous values without changing old records", () => {
  let s = createSeed(env.today);
  s = applyCommand(
    s,
    {
      type: "request-loan",
      id: "diff",
      itemId: "cake-stand",
      start: "2026-12-20",
      end: "2026-12-22",
      lockerId: "clementi",
    },
    env,
  );
  s.activeUserId = "sarah";
  s = applyCommand(
    s,
    {
      type: "edit-plan",
      loanId: "diff",
      start: "2026-12-21",
      end: "2026-12-23",
      lockerId: "toa-payoh",
    },
    env,
  );
  const l = s.loans.find((l) => l.id === "diff")!;
  assert.deepEqual(l.previousPlan, {
    start: "2026-12-20",
    end: "2026-12-22",
    lockerId: "clementi",
  });
  assert.deepEqual(l.approvals, ["sarah"]);
  assert.ok(decodeStore(JSON.stringify(s)));
});
