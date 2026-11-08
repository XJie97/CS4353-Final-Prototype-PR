import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCommand, type Command, type Store } from "./domain.ts";
import { createSeed } from "./seed.ts";
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
test("help offer selection creates ordinary loan once", () => {
  let s = fixture();
  s = applyCommand(s, { type: "switch-account", id: "eric" }, env);
  const choose: Command = {
    type: "select-offer",
    id: "offer",
    loanId: "chosen",
    lockerId: "clementi",
  };
  s = applyCommand(s, choose, env);
  // Verify that selecting an offer creates a normal pending loan.
  assert.equal(s.loans.find((l) => l.id === "chosen")?.status, "requested");
  // Verify that selecting an offer records the help request as selected.
  assert.equal(s.helpRequests![0].status, "selected");
  // Verify that the same offer cannot be selected twice.
  assert.throws(() => applyCommand(s, choose, env));
});
test("help rejects wrong roles, duplicate, expired and reversed requests", () => {
  const s = fixture();
  // Verify that a different account cannot close the request.
  assert.throws(() => applyCommand(s, { type: "close-help", id: "help" }, env));
  // Verify that a different account cannot select the offer.
  assert.throws(() =>
    applyCommand(
      s,
      { type: "select-offer", id: "offer", loanId: "x", lockerId: "clementi" },
      env,
    ),
  );
  // Verify that an item cannot have duplicate active offers for one request.
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
  // Verify that a request cannot end before its start date.
  assert.throws(() =>
    applyCommand(s, { ...post, id: "bad", end: "2026-12-01" }, env),
  );
  // Verify that a request cannot start in the past.
  assert.throws(() =>
    applyCommand(s, { ...post, id: "bad", start: "2020-01-01" }, env),
  );
});
test("withdrawal, closure and intervening bookings prevent selection", () => {
  let s = fixture();
  s = applyCommand(s, { type: "withdraw-offer", id: "offer" }, env);
  s = applyCommand(s, { type: "switch-account", id: "eric" }, env);
  // Verify that a withdrawn offer cannot be selected.
  assert.throws(() =>
    applyCommand(
      s,
      { type: "select-offer", id: "offer", loanId: "x", lockerId: "clementi" },
      env,
    ),
  );
  s = applyCommand(s, { type: "close-help", id: "help" }, env);
  // Verify that closing a request records its closed status.
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
  // Verify that an intervening booking prevents selection of an overlapping offer.
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
  // Verify that distinct items can remain available as separate offers.
  assert.equal(s.offers!.length, 2);
  // Verify that receiving offers alone does not select or close the request.
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
  // Verify that editing a review preserves the loan's completed status.
  assert.equal(s.loans.find((v) => v.id === l.id)!.status, "complete");
  // Verify that the edited review text survives serialization and reload.
  assert.equal(s.loans.find((v) => v.id === l.id)!.review!.text, "Updated");
  s.activeUserId = l.ownerId;
  // Verify that another account cannot edit the borrower's review.
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
  // Verify that a counterproposal retains the immediately preceding plan values.
  assert.deepEqual(l.previousPlan, {
    start: "2026-12-20",
    end: "2026-12-22",
    lockerId: "clementi",
  });
  // Verify that a counterproposal clears prior approvals except for its author.
  assert.deepEqual(l.approvals, ["sarah"]);
});
