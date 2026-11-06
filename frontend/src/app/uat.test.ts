import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCommand, type Store, type Command } from "./domain.ts";
import { createSeed } from "./seed.ts";
import { helpOutcome, visibleHelpRequests } from "./help-view.ts";
const env = { id: "uat", today: "2026-11-04", now: "2026-11-04T12:00:00Z" };
function fixture(): Store {
  let s = createSeed(env.today);
  s = applyCommand(
    s,
    {
      type: "post-help",
      id: "h",
      title: "Stand",
      description: "For a cake",
      start: "2026-12-20",
      end: "2026-12-22",
    },
    env,
  );
  s = applyCommand(s, { type: "switch-account", id: "sarah" }, env);
  s = applyCommand(
    s,
    { type: "offer-help", id: "o", requestId: "h", itemId: "cake-stand" },
    env,
  );
  return applyCommand(s, { type: "switch-account", id: "eric" }, env);
}
function rejected(s: Store, c: Command) {
  const before = JSON.stringify(s);
  // Verify that a forbidden command throws rather than succeeds.
  assert.throws(() => applyCommand(s, c, env));
  // Verify that a rejected command leaves the original store byte-for-byte unchanged.
  assert.equal(JSON.stringify(s), before);
}
test("closed requests leave community, remain requester history, and reject offers", () => {
  let s = fixture();
  // Verify that an open help request appears in the community feed.
  assert.equal(visibleHelpRequests(s, false).length, 1);
  s = applyCommand(s, { type: "close-help", id: "h" }, env);
  // Verify that closing a request removes it from the community feed.
  assert.equal(visibleHelpRequests(s, false).length, 0);
  // Verify that a closed request remains visible in its requester's history.
  assert.equal(visibleHelpRequests(s, true).length, 1);
  // Verify that closed-request history explains that the request was closed.
  assert.equal(helpOutcome(s, s.helpRequests![0]), "Request closed");
  s = applyCommand(s, { type: "switch-account", id: "sarah" }, env);
  // Verify that other accounts do not see the requester's private request history.
  assert.equal(visibleHelpRequests(s, true).length, 0);
  rejected(s, {
    type: "offer-help",
    id: "new",
    requestId: "h",
    itemId: "cake-large",
  });
});
for (const action of ["cancel-loan", "decline-loan"] as const)
  test(`selected request remains historical after owner ${action} and reload`, () => {
    let s = fixture();
    s = applyCommand(
      s,
      { type: "select-offer", id: "o", loanId: "l", lockerId: "clementi" },
      env,
    );
    // Verify that selecting an offer removes the request from the open community feed.
    assert.equal(visibleHelpRequests(s, false).length, 0);
    s = applyCommand(s, { type: "switch-account", id: "sarah" }, env);
    s = applyCommand(s, { type: action, loanId: "l" }, env);
    rejected(s, {
      type: "offer-help",
      id: "late",
      requestId: "h",
      itemId: "cake-large",
    });
    s = applyCommand(s, { type: "switch-account", id: "eric" }, env);
    const notices = s.notices.length;
    // Verify that a canceled or declined selected loan does not reopen the community request.
    assert.equal(visibleHelpRequests(s, false).length, 0);
    // Verify that the selected request remains in its requester's history.
    assert.equal(visibleHelpRequests(s, true).length, 1);
    // Verify that request history reflects the linked loan's cancellation or decline.
    assert.equal(
      helpOutcome(s, s.helpRequests![0]),
      action === "cancel-loan" ? "Loan cancelled" : "Loan declined",
    );
    // Verify that repeated rejected selection does not create extra offers.
    assert.equal(s.offers!.length, 1);
    helpOutcome(s, s.helpRequests![0]);
    // Verify that repeated rejected selection does not create extra notices.
    assert.equal(s.notices.length, notices);
  });
test("borrower cancellation never reopens request or duplicates linked loans", () => {
  let s = fixture();
  s = applyCommand(
    s,
    { type: "select-offer", id: "o", loanId: "l", lockerId: "clementi" },
    env,
  );
  s = applyCommand(s, { type: "cancel-loan", loanId: "l" }, env);
  rejected(s, {
    type: "select-offer",
    id: "o",
    loanId: "duplicate",
    lockerId: "clementi",
  });
  // Verify that borrower cancellation does not reopen the selected request.
  assert.equal(visibleHelpRequests(s, false).length, 0);
  // Verify that borrower cancellation leaves exactly one linked loan.
  assert.equal(s.loans.filter((l) => l.id === "l").length, 1);
});
test("wrong owner cannot withdraw and failed selection leaves original data intact", () => {
  let s = fixture();
  rejected(s, { type: "withdraw-offer", id: "o" });
  s = applyCommand(s, { type: "switch-account", id: "ben" }, env);
  rejected(s, {
    type: "select-offer",
    id: "o",
    loanId: "bad",
    lockerId: "clementi",
  });
});
