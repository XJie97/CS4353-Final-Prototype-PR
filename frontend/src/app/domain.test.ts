import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyCommand,
  handoverCode,
  nextProof,
  type Command,
  type Store,
} from "./domain.ts";
import { createSeed } from "./seed.ts";
const env = {
  id: "test-event",
  now: "2026-10-31T04:00:00.000Z",
  today: "2026-10-31",
};
const photo = "data:image/jpeg;base64,dGVzdA==";
function run(s: Store, c: Command) {
  return applyCommand(s, c, env);
}
function requested() {
  return run(createSeed(env.today), {
    type: "request-loan",
    id: "new-loan",
    itemId: "cake-stand",
    start: "2026-11-03",
    end: "2026-11-06",
    lockerId: "clementi",
  });
}
function accepted() {
  let s = requested();
  s = run(s, { type: "switch-account", id: "sarah" });
  return run(s, { type: "approve-plan", loanId: "new-loan" });
}

test("a dated request is pending, notifies the owner, and does not mutate the catalog", () => {
  const original = createSeed(env.today);
  const s = run(original, {
    type: "request-loan",
    id: "new-loan",
    itemId: "cake-stand",
    start: "2026-11-03",
    end: "2026-11-06",
    lockerId: "clementi",
  });
  // Verify that a new loan starts in the requested state.
  assert.equal(s.loans.find((l) => l.id === "new-loan")?.status, "requested");
  // Verify that requesting a loan notifies its item owner.
  assert.ok(s.notices.some((n) => n.to === "sarah" && n.loanId === "new-loan"));
  // Verify that the result contains one new loan while the original store is preserved.
  assert.equal(original.loans.length + 1, s.loans.length);
});
test("requests reject past/reversed dates, self borrowing and overlapping bookings", () => {
  const s = requested();
  const base = {
    type: "request-loan",
    id: "other",
    itemId: "cake-stand",
    start: "2026-11-03",
    end: "2026-11-06",
    lockerId: "clementi",
  } as const;
  // Verify that an existing reservation blocks overlapping dates.
  assert.throws(() => run(s, base), /overlap/i);
  // Verify that borrowing cannot start in the past.
  assert.throws(() => run(s, { ...base, start: "2026-10-01" }), /past/i);
  // Verify that the end date cannot precede the start date.
  assert.throws(() => run(s, { ...base, end: "2026-11-01" }), /after/i);
  // Verify that an owner cannot borrow their own item.
  assert.throws(() => run(s, { ...base, itemId: "my-projector" }), /own item/i);
});
test("only the owner accepts a request; changing the plan requires renewed approval", () => {
  let s = requested();
  // Verify that the borrower cannot accept their own initial request.
  assert.throws(
    () => run(s, { type: "approve-plan", loanId: "new-loan" }),
    /owner/i,
  );
  s = accepted();
  // Verify that owner acceptance makes the initially agreed plan ready.
  assert.equal(s.loans.find((l) => l.id === "new-loan")?.status, "ready");
  s = run(s, {
    type: "edit-plan",
    loanId: "new-loan",
    start: "2026-11-04",
    end: "2026-11-07",
    lockerId: "toa-payoh",
  });
  // Verify that changing the plan discards the other participant's previous approval.
  assert.deepEqual(s.loans.find((l) => l.id === "new-loan")?.approvals, [
    "sarah",
  ]);
  s = run(s, { type: "switch-account", id: "eric" });
  s = run(s, { type: "approve-plan", loanId: "new-loan" });
  // Verify that renewed approval makes the changed plan ready again.
  assert.equal(s.loans.find((l) => l.id === "new-loan")?.status, "ready");
});
test("four photo-backed handovers enforce actor, code and stage order", () => {
  let s = accepted();
  let loan = s.loans.find((l) => l.id === "new-loan")!;
  // Verify that handover begins with the owner's drop-off step.
  assert.equal(nextProof(loan), "ownerDropoff");
  // Verify that pickup cannot precede the owner's drop-off proof.
  assert.throws(
    () =>
      run(s, {
        type: "record-proof",
        loanId: loan.id,
        step: "borrowerPickup",
        photo,
        code: handoverCode(loan, "borrowerPickup"),
        lockerNumber: "12",
      }),
    /next|order/i,
  );
  // Verify that an incorrect handover code is rejected.
  assert.throws(
    () =>
      run(s, {
        type: "record-proof",
        loanId: loan.id,
        step: "ownerDropoff",
        photo,
        code: "wrong",
        lockerNumber: "12",
      }),
    /code/i,
  );
  for (const [step, actor, status] of [
    ["ownerDropoff", "sarah", "ready"],
    ["borrowerPickup", "eric", "active"],
    ["borrowerDropoff", "eric", "returning"],
    ["ownerPickup", "sarah", "verifying"],
  ] as const) {
    s = run(s, { type: "switch-account", id: actor });
    loan = s.loans.find((l) => l.id === "new-loan")!;
    // Verify that every handover stage requires a valid photo.
    assert.throws(
      () =>
        run(s, {
          type: "record-proof",
          loanId: loan.id,
          step,
          photo: "",
          code: handoverCode(loan, step),
          lockerNumber: "12",
        }),
      /photo/i,
    );
    s = run(s, {
      type: "record-proof",
      loanId: loan.id,
      step,
      photo,
      code: handoverCode(loan, step),
      lockerNumber: "12",
    });
    // Verify that each recorded proof advances to its expected loan status.
    assert.equal(s.loans.find((l) => l.id === loan.id)?.status, status);
  }
  // Verify that cancellation is blocked after physical handover begins.
  assert.throws(
    () => run(s, { type: "cancel-loan", loanId: "new-loan" }),
    /cancel/i,
  );
  s = run(s, {
    type: "verify-condition",
    loanId: "new-loan",
    condition: "good",
    note: "",
  });
  // Verify that the owner's good-condition confirmation completes the loan.
  assert.equal(s.loans.find((l) => l.id === "new-loan")?.status, "complete");
  s = run(s, { type: "switch-account", id: "eric" });
  s = run(s, {
    type: "submit-review",
    loanId: "new-loan",
    rating: 5,
    text: "Lovely cake stand!",
    compliments: ["Great communication"],
  });
  // Verify that a completed loan stores the borrower's rating.
  assert.equal(s.loans.find((l) => l.id === "new-loan")?.review?.rating, 5);
  // Verify that submitting a second review for the same loan is rejected.
  assert.throws(
    () =>
      run(s, {
        type: "submit-review",
        loanId: "new-loan",
        rating: 5,
        text: "Again",
        compliments: [],
      }),
    /already/i,
  );
});
test("unrelated accounts cannot modify another loan", () => {
  let s = accepted();
  s = run(s, { type: "switch-account", id: "maya" });
  // Verify that a nonparticipant cannot edit the loan's exchange plan.
  assert.throws(
    () =>
      run(s, {
        type: "edit-plan",
        loanId: "new-loan",
        start: "2026-11-04",
        end: "2026-11-07",
        lockerId: "clementi",
      }),
    /participant/i,
  );
});
