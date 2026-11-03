import { expect, it } from "vitest";
import { parseRoute, PAGES } from "./router";
it("keeps deep loan/photo flows inside the five page routes", () => {
  expect(PAGES).toHaveLength(5);
  expect(parseRoute("/loans", "?loan=abc")).toEqual({
    page: "loans",
    loanId: "abc",
  });
  expect(parseRoute("/photos", "")).toEqual({ page: "borrow", loanId: null });
});
