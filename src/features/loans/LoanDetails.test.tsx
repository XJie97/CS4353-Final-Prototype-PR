import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Loan, QrChallenge } from "../../core/types";
import { LoanDetails } from "./LoanDetails";
const fake = vi.hoisted(() => ({
  loan: null as Loan | null,
  upload: vi.fn(),
  record: vi.fn(),
  scan: vi.fn(),
}));
vi.mock("../auth/context", () => ({ useAuth: () => ({ id: "owner" }) }));
vi.mock("../../core/services", () => ({
  services: {
    loans: { getLoan: async () => fake.loan },
    items: { getItem: async () => ({ name: "Camera", lockerIds: [1] }) },
    users: { getUser: async (id: string) => ({ id, name: id }) },
    handoff: {
      getQr: async () =>
        ({
          id: "qr",
          payload: "cs4353-demo:qr",
          lockerId: 1,
          step: "owner_dropoff",
        }) as QrChallenge,
      simulateScan: (...args: unknown[]) => fake.scan(...args),
      uploadPhoto: (...args: unknown[]) => fake.upload(...args),
      recordPhoto: (...args: unknown[]) => fake.record(...args),
    },
  },
}));
const initial: Loan = {
  id: "loan",
  itemId: "camera",
  ownerId: "owner",
  borrowerId: "borrower",
  startsOn: "2026-11-01",
  dueOn: "2026-11-02",
  lockerId: 1,
  revision: 1,
  status: "plan_approved",
  temporalStatus: "upcoming",
  phase: "not_started",
  pendingPhoto: null,
  nextScan: "owner_dropoff",
  photos: {
    owner_dropoff: null,
    borrower_pickup: null,
    borrower_dropoff: null,
    owner_pickup: null,
  },
  checklist: {
    version: 1,
    items: [
      { id: "item", label: "Correct item inspected" },
      { id: "parts", label: "Included parts inspected" },
      { id: "condition", label: "Item condition inspected" },
    ],
  },
  answers: [],
};
beforeEach(() => {
  vi.clearAllMocks();
  fake.loan = structuredClone(initial);
  fake.upload.mockResolvedValue("loan/photo.png");
  fake.record.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <LoanDetails id="loan" close={() => {}} />
    </QueryClientProvider>,
  );
}
it("opens the required photo after bypass and resumes it when revisiting the loan", async () => {
  const u = userEvent.setup();
  fake.scan.mockImplementation(async () => {
    fake.loan = {
      ...fake.loan!,
      pendingPhoto: "owner_dropoff",
      nextScan: null,
      phase: "ready_for_borrower_collection",
    };
  });
  const view = mount();
  await u.click(await screen.findByRole("button", { name: "Get QR" }));
  await u.click(
    await screen.findByRole("button", { name: "Bypass: simulate locker scan" }),
  );
  // Verify that a pending owner-dropoff proof opens the matching photo form.
  expect(
    await screen.findByRole("heading", { name: "Photo: Owner dropoff" }),
  ).toBeTruthy();
  // Verify that merely opening a pending photo form does not upload a file.
  expect(fake.upload).not.toHaveBeenCalled();
  await u.click(
    screen.getByRole("button", {
      name: "Back to loan (photo remains pending)",
    }),
  );
  // Verify that pending photo evidence remains visible on the loan detail screen.
  expect(await screen.findByText(/Pending photo: Owner dropoff/)).toBeTruthy();
  // Verify that a pending photo prevents requesting a fresh QR handover.
  expect(screen.queryByRole("button", { name: "Get QR" })).toBeNull();
  view.unmount();
  mount();
  // Verify that the pending photo form can be reopened without scanning again.
  expect(
    await screen.findByRole("heading", { name: "Photo: Owner dropoff" }),
  ).toBeTruthy();
});
it("requires the final checklist and retries photo finalization without uploading twice", async () => {
  const u = userEvent.setup();
  fake.loan = {
    ...initial,
    status: "returned",
    temporalStatus: "past",
    phase: "complete",
    nextScan: null,
    pendingPhoto: "owner_pickup",
  };
  fake.record
    .mockRejectedValueOnce(new Error("Temporary connection failure"))
    .mockResolvedValueOnce(undefined);
  mount();
  // Verify that returned loans still explain any required final photo evidence.
  expect(
    await screen.findByText(
      "The loan is already Returned/Past. Final evidence is still required.",
    ),
  ).toBeTruthy();
  const chosen = new File(["photo"], "item.png", { type: "image/png" });
  await u.upload(screen.getByLabelText("Photo of item inside locker"), chosen);
  // jsdom does not serialize user-event's synthetic FileList into FormData.
  const NativeFormData = FormData;
  vi.spyOn(globalThis, "FormData").mockImplementation(function (
    form?: HTMLFormElement,
  ) {
    const data = new NativeFormData(form);
    data.set("image", chosen);
    return data;
  });
  // Verify that a failed proof save preserves the selected photo for retry.
  expect(
    (screen.getByLabelText("Photo of item inside locker") as HTMLInputElement)
      .files?.length,
  ).toBe(1);
  const checks = within(
    screen.getByRole("group", { name: "Return checklist (version 1)" }),
  ).getAllByRole("checkbox");
  for (const check of checks) await u.click(check);

  fireEvent.submit(
    (
      screen.getByRole("button", {
        name: "Save handoff photo",
      }) as HTMLButtonElement
    ).form!,
  );
  // Verify that failed evidence recording is displayed as an alert.
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Temporary connection failure",
  );
  fireEvent.submit(
    (
      screen.getByRole("button", {
        name: "Save handoff photo",
      }) as HTMLButtonElement
    ).form!,
  );
  await screen.findByRole("button", { name: "Resume photo" });
  // Verify that retrying evidence recording does not upload the same file again.
  expect(fake.upload).toHaveBeenCalledTimes(1);
  // Verify that the retry actually calls evidence recording again.
  expect(fake.record).toHaveBeenNthCalledWith(
    2,
    "loan",
    "owner_pickup",
    "loan/photo.png",
    ["item", "parts", "condition"],
  );
});
