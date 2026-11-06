import { expect, it } from "vitest";
import { parseRoute, PAGES } from "./router";
it("keeps deep loan/photo flows inside the five page routes", () => {
  // Verify the fixed set of supported top-level application pages.
  expect(PAGES).toHaveLength(5);
  // Verify that parsing a loan URL retains its query-string loan ID.
  expect(parseRoute("/loans", "?loan=abc")).toEqual({
    page: "loans",
    loanId: "abc",
  });
  // Verify that an unsupported route falls back to the borrow page.
  expect(parseRoute("/photos", "")).toEqual({ page: "borrow", loanId: null });
});
