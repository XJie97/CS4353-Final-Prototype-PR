import assert from "node:assert/strict";
import { test } from "node:test";
import { validateImageFile } from "./images.ts";
import { applyCommand, handoverCode } from "./domain.ts";
import { createSeed } from "./seed.ts";
const env = {
  id: "handover",
  now: "2026-10-31T05:00:00Z",
  today: "2026-10-31",
};
test("photos reject unsupported file formats, empty files and oversized uploads", () => {
  // Verify that SVG files are rejected as photo uploads.
  assert.throws(
    () => validateImageFile({ type: "image/svg+xml", size: 100 }),
    /JPEG|PNG|WebP/,
  );
  // Verify that an empty image file is rejected.
  assert.throws(
    () => validateImageFile({ type: "image/png", size: 0 }),
    /empty/i,
  );
  // Verify that images larger than five megabytes are rejected.
  assert.throws(
    () => validateImageFile({ type: "image/png", size: 6 * 1024 * 1024 }),
    /5 MB/,
  );
  // Verify that a small JPEG passes file validation.
  assert.doesNotThrow(() =>
    validateImageFile({ type: "image/jpeg", size: 2000 }),
  );
});
test("a handover requires the completed locker scan assignment", () => {
  const s = createSeed(env.today),
    loan = s.loans.find((l) => l.id === "demo-active")!;
  // Verify that handover evidence is rejected until the locker scan is confirmed.
  assert.throws(
    () =>
      applyCommand(
        s,
        {
          type: "record-proof",
          loanId: loan.id,
          step: "borrowerPickup",
          code: handoverCode(loan, "borrowerPickup"),
          lockerNumber: "12",
          photo: "data:image/jpeg;base64,dGVzdA==",
        },
        env,
      ),
    /locker scan/i,
  );
  // Verify that even a confirmed scan must provide a valid assigned locker number.
  assert.throws(
    () =>
      applyCommand(
        s,
        {
          type: "record-proof",
          loanId: loan.id,
          step: "borrowerPickup",
          code: handoverCode(loan, "borrowerPickup"),
          lockerNumber: "0",
          assignmentVerified: true,
          photo: "data:image/jpeg;base64,dGVzdA==",
        },
        env,
      ),
    /valid locker/i,
  );
});
test("borrowers cannot review an unfinished loan or claim an owner handover", () => {
  const s = createSeed(env.today);
  // Verify that borrowers cannot review a loan before it is complete.
  assert.throws(
    () =>
      applyCommand(
        s,
        {
          type: "submit-review",
          loanId: "demo-active",
          rating: 5,
          text: "Hello",
          compliments: [],
        },
        env,
      ),
    /completed/i,
  );
  const l = s.loans.find((l) => l.id === "demo-incoming")!;
  // Verify that a handover cannot proceed before the loan is ready.
  assert.throws(
    () =>
      applyCommand(
        s,
        {
          type: "record-proof",
          loanId: l.id,
          step: "ownerDropoff",
          code: handoverCode(l, "ownerDropoff"),
          photo: "data:image/jpeg;base64,dGVzdA==",
          lockerNumber: "12",
          assignmentVerified: true,
        },
        env,
      ),
    /ready/i,
  );
});
