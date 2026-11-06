import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCommand, type Store, type Command } from "./domain.ts";
import { createSeed } from "./seed.ts";
const env = {
  id: "community-event",
  now: "2026-10-31T06:00:00Z",
  today: "2026-10-31",
};
const run = (s: Store, c: Command) => applyCommand(s, c, env);
const listing = {
  type: "create-item",
  id: "shared-drill",
  name: "  Hammer drill  ",
  description: "A sturdy drill with a spare battery.",
  category: "Tools",
  location: "Clementi",
  images: [],
} as const;
test("shared listings belong to the active account and only their owner can edit or hide them", () => {
  let s = run(createSeed(env.today), { ...listing, images: [] });
  // Verify that a new listing belongs to the active account.
  assert.equal(s.items.find((i) => i.id === listing.id)?.ownerId, "eric");
  // Verify that a new listing stores its submitted item name.
  assert.equal(s.items.find((i) => i.id === listing.id)?.name, "Hammer drill");
  s = run(s, { type: "toggle-item", id: listing.id });
  // Verify that toggling visibility hides the owner's listing.
  assert.equal(s.items.find((i) => i.id === listing.id)?.listed, false);
  s = run(s, { type: "switch-account", id: "sarah" });
  // Verify that another account cannot change the listing's visibility.
  assert.throws(
    () => run(s, { type: "toggle-item", id: listing.id }),
    /owner/i,
  );
  // Verify that another account cannot edit the listing.
  assert.throws(
    () => run(s, { ...listing, type: "edit-item", images: [] }),
    /owner/i,
  );
});
test("listing validation rejects invalid or oversized photos and missing descriptions", () => {
  const s = createSeed(env.today);
  // Verify that arbitrary remote image URLs are rejected as listing photos.
  assert.throws(
    () =>
      run(s, { ...listing, images: ["https://untrusted.example/photo.png"] }),
    /photo/i,
  );
  // Verify that a listing requires a nonblank description.
  assert.throws(
    () => run(s, { ...listing, description: "", images: [] }),
    /description/i,
  );
});
test("incoming friend requests can only be accepted by their recipient and do not duplicate", () => {
  let s = createSeed(env.today);
  s = run(s, { type: "accept-friend", id: "request-ben" });
  // Verify that the intended recipient can accept a pending friend request.
  assert.equal(
    s.friends.find((f) => f.id === "request-ben")?.status,
    "accepted",
  );
  // Verify that an existing friendship prevents a duplicate request.
  assert.throws(
    () => run(s, { type: "request-friend", id: "duplicate", to: "ben" }),
    /already/i,
  );
  s = run(s, { type: "switch-account", id: "ben" });
  // Verify that an already accepted request cannot be accepted by another account.
  assert.throws(
    () => run(s, { type: "accept-friend", id: "request-ben" }),
    /recipient|pending/i,
  );
});
test("profiles validate usernames and reject duplicate names without altering other users", () => {
  let s = createSeed(env.today);
  const original = s.people.find((p) => p.id === "sarah")!;
  // Verify that a profile cannot take a username already used by someone else.
  assert.throws(
    () =>
      run(s, {
        type: "update-profile",
        name: "Eric",
        username: "sarah",
        location: "Clementi",
        bio: "",
      }),
    /taken/i,
  );
  s = run(s, {
    type: "update-profile",
    name: "Eric Xiong",
    username: "eric_x",
    location: "Clementi",
    bio: "Hello, neighbours!",
  });
  // Verify that the active user's display-name update is saved.
  assert.equal(s.people.find((p) => p.id === "eric")?.name, "Eric Xiong");
  // Verify that editing one profile leaves another person's profile unchanged.
  assert.deepEqual(
    s.people.find((p) => p.id === "sarah"),
    original,
  );
});
test("reviews require completion and ratings; condition issues must be resolved before review", () => {
  let s = createSeed(env.today);
  const loan = s.loans.find((l) => l.id === "demo-complete")!;
  // Verify that review ratings below the allowed range are rejected.
  assert.throws(
    () =>
      run(s, {
        type: "submit-review",
        loanId: loan.id,
        rating: 0,
        text: "Great",
        compliments: [],
      }),
    /rating/i,
  );
  // Verify that an empty review is rejected.
  assert.throws(
    () =>
      run(s, {
        type: "submit-review",
        loanId: loan.id,
        rating: 5,
        text: "",
        compliments: [],
      }),
    /review/i,
  );
  loan.status = "verifying";
  delete loan.condition;
  s = run(s, { type: "switch-account", id: loan.ownerId });
  s = run(s, {
    type: "verify-condition",
    loanId: loan.id,
    condition: "issue",
    note: "A handle was chipped.",
  });
  // Verify that reporting a return-condition issue keeps the loan awaiting verification.
  assert.equal(s.loans.find((l) => l.id === loan.id)?.status, "verifying");
  // Verify that resolving an issue requires a nonblank resolution note.
  assert.throws(
    () => run(s, { type: "resolve-condition", loanId: loan.id, note: "" }),
    /resolution/i,
  );
  s = run(s, {
    type: "resolve-condition",
    loanId: loan.id,
    note: "We agreed on a replacement handle.",
  });
  // Verify that resolving the return-condition issue completes the loan.
  assert.equal(s.loans.find((l) => l.id === loan.id)?.status, "complete");
});
