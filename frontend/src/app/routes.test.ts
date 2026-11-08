import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseRoute,
  isTabRoot,
  parentRoute,
  hidesTopBar,
  routeHash,
} from "./routes.ts";
import { calendarDays } from "./calendar.ts";
test("routes support loan and chat deep links and tolerate malformed or unknown hashes", () => {
  // Verify that a loan deep link retains its loan ID.
  assert.deepEqual(parseRoute("#loans/demo-active"), {
    page: "loans",
    id: "demo-active",
  });
  // Verify that a chat deep link retains its conversation peer ID.
  assert.deepEqual(parseRoute("#chats/sarah"), { page: "chats", id: "sarah" });
  // Verify that item-detail hashes remain handled by the borrow feature.
  assert.deepEqual(parseRoute("#borrow/item/cake-stand"), { page: "borrow" });
  // Verify that an unknown hash falls back to borrowing.
  assert.deepEqual(parseRoute("#unknown"), { page: "borrow" });
  // Verify that malformed URL encoding safely falls back to borrowing.
  assert.deepEqual(parseRoute("#loans/%"), { page: "borrow" });
});
test("calendar starts on Monday, includes leap day, and has exactly six weeks", () => {
  const dates = calendarDays("2028-02");
  // Verify that the calendar grid always contains six full weeks.
  assert.equal(dates.length, 42);
  // Verify that the calendar includes leap day in a leap year.
  assert.ok(dates.includes("2028-02-29"));
  // Verify that the first calendar column starts on Monday.
  assert.equal(new Date(dates[0] + "T12:00:00Z").getUTCDay(), 1);
  // Verify that the calendar's 42 displayed dates are all distinct.
  assert.equal(new Set(dates).size, 42);
});
test("tab pages are roots; other pages fall back to the page they sit under", () => {
  for (const page of ["borrow", "share", "loans", "friends", "me"] as const)
    assert.ok(isTabRoot({ page }));
  assert.ok(!isTabRoot({ page: "loans", id: "x" }));
  assert.ok(!isTabRoot({ page: "chats" }));
  assert.ok(!isTabRoot({ page: "notifications" }));
  assert.deepEqual(parentRoute({ page: "loans", id: "x" }), { page: "loans" });
  assert.deepEqual(parentRoute({ page: "friends", id: "network" }), {
    page: "friends",
  });
  assert.deepEqual(parentRoute({ page: "me", id: "avatar" }), { page: "me" });
  assert.deepEqual(parentRoute({ page: "chats" }), { page: "borrow" });
  assert.ok(!hidesTopBar({ page: "me", id: "avatar" }));
  assert.ok(!hidesTopBar({ page: "me" }));
  assert.equal(routeHash({ page: "chats", id: "a b" }), "#chats/a%20b");
});
