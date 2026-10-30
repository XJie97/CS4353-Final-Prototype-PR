import { describe, expect, it } from "vitest";
import {
  fileExtension,
  friendlyError,
  nextMilestone,
  type Loan,
} from "./model";

describe("verification progression", () => {
  const loan = {
    owner_dropoff_at: null,
    borrower_pickup_at: null,
    borrower_dropoff_at: null,
    returned_at: null,
  } as Loan;
  it("requires each of the four milestones in order", () => {
    expect(nextMilestone(loan)?.key).toBe("owner_dropoff");
    expect(nextMilestone({ ...loan, owner_dropoff_at: "now" })?.key).toBe(
      "borrower_pickup",
    );
    expect(
      nextMilestone({
        ...loan,
        owner_dropoff_at: "now",
        borrower_pickup_at: "now",
      })?.key,
    ).toBe("borrower_dropoff");
    expect(
      nextMilestone({
        ...loan,
        owner_dropoff_at: "now",
        borrower_pickup_at: "now",
        borrower_dropoff_at: "now",
      })?.key,
    ).toBe("owner_pickup");
    expect(
      nextMilestone({
        ...loan,
        owner_dropoff_at: "now",
        borrower_pickup_at: "now",
        borrower_dropoff_at: "now",
        returned_at: "now",
      }),
    ).toBeUndefined();
  });
});

describe("safe photo uploads", () => {
  it("accepts supported image content types without trusting the filename", () => {
    expect(
      fileExtension(
        new File(["image"], "misleading.svg", { type: "image/jpeg" }),
      ),
    ).toBe("jpg");
    expect(() =>
      fileExtension(new File(["svg"], "image.jpg", { type: "image/svg+xml" })),
    ).toThrow("JPEG, PNG, or WebP");
  });
  it("rejects images above the bucket size limit before uploading", () => {
    expect(() =>
      fileExtension(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
          type: "image/png",
        }),
      ),
    ).toThrow("5 MB");
  });
});

it("explains overlap and custody errors returned by the live constraints", () => {
  expect(
    friendlyError({ code: "23P01", message: "exclusion violation" }),
  ).toContain("overlap");
  expect(friendlyError({ code: "23505" })).toContain(
    "still with another borrower",
  );
  expect(friendlyError({ code: "42501" })).toContain("permission");
});
