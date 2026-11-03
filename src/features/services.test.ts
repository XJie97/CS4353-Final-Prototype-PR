import { describe, it, expect, vi } from "vitest";
import type { DataGateway } from "../core/gateway";
import { makeItemsService, normalizeTags } from "./items/service";
import { makeLoansService } from "./loans/service";
import { makeHandoffService } from "./handoff/service";
import { distinctFriends } from "./friendships/service";
import { makeChatsService } from "./chats/service";
import { imageExtension } from "../core/errors";
import type { Loan, QrChallenge } from "../core/types";
const fake = () =>
  ({
    list: vi.fn().mockResolvedValue([]),
    insert: vi.fn(),
    rpc: vi.fn().mockResolvedValue(null),
    upload: vi.fn().mockImplementation((_b, p) => Promise.resolve(p)),
    removeFile: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    signedUrl: vi.fn(),
    subscribe: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    observeAuth: vi.fn(),
  }) as unknown as DataGateway;

describe("feature contracts", () => {
  it("normalizes category tags without UI-specific rules", () =>
    expect(normalizeTags([" Tools ", "tools", "", "BOOKS"])).toEqual([
      "tools",
      "books",
    ]));
  it("combines category, locker and friendship filters without loading other features", async () => {
    const api = fake();
    vi.mocked(api.list).mockImplementation(async (table) =>
      table === "item_catalog"
        ? [
            {
              id: "a",
              owner_id: "friend",
              name: "Camera",
              description: "",
              category_tags: ["tools"],
              status: "available",
              compliments: [],
            },
            {
              id: "b",
              owner_id: "outsider",
              name: "Book",
              description: "",
              category_tags: ["books"],
              status: "available",
              compliments: [],
            },
          ]
        : [
            { item_id: "a", locker_id: 2 },
            { item_id: "b", locker_id: 3 },
          ],
    );
    const items = await makeItemsService(api).getItems({
      tags: ["tools"],
      lockerIds: [2],
      friendsOnly: true,
      friendIds: ["friend"],
    });
    expect(items.map((i) => i.id)).toEqual(["a"]);
    expect(api.list).toHaveBeenCalledTimes(2);
  });
  it("rejects malformed loan dates before calling the repository", async () => {
    const api = fake();
    await expect(
      makeLoansService(api).createLoan("item", {
        startsOn: "2026-11-02",
        dueOn: "2026-11-01",
        lockerId: 1,
      }),
    ).rejects.toThrow("End date");
    expect(api.rpc).not.toHaveBeenCalled();
  });
  it("does not let a borrower supply another actor when creating a loan", async () => {
    const api = fake();
    await makeLoansService(api).createLoan("item", {
      startsOn: "2026-11-01",
      dueOn: "2026-11-02",
      lockerId: 2,
    });
    expect(api.rpc).toHaveBeenCalledWith("create_loan", {
      target_item: "item",
      start_date: "2026-11-01",
      end_date: "2026-11-02",
      selected_locker: 2,
    });
  });
  it("separates simulated scanning from photo recording", async () => {
    const api = fake();
    const scan = vi.fn().mockResolvedValue(undefined);
    const qr = {
      id: "q",
      loanId: "l",
      step: "owner_dropoff",
      lockerId: 1,
      payload: "demo",
    } as QrChallenge;
    const service = makeHandoffService(api, {
      getQr: async () => qr,
      simulateScan: scan,
    });
    await service.simulateScan(qr);
    expect(scan).toHaveBeenCalledWith(qr);
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.rpc).not.toHaveBeenCalled();
    await service.recordPhoto(
      "l",
      "owner_dropoff",
      "l/owner_dropoff/photo.jpg",
      [],
    );
    expect(api.rpc).toHaveBeenCalledWith("record_handoff_photo", {
      target: "l",
      step: "owner_dropoff",
      image_path: "l/owner_dropoff/photo.jpg",
      answers: [],
    });
  });
  it("retries finalization with an existing path without uploading another image", async () => {
    const api = fake();
    const s = makeHandoffService(api, {
      getQr: vi.fn(),
      simulateScan: vi.fn(),
    });
    await s.recordPhoto("l", "borrower_pickup", "existing.jpg", []);
    await s.recordPhoto("l", "borrower_pickup", "existing.jpg", []);
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.rpc).toHaveBeenCalledTimes(2);
  });
  it("returns distinct friends while retaining duplicate relationships", () => {
    expect(
      distinctFriends(
        [
          {
            id: "a",
            requesterId: "me",
            recipientId: "bob",
            status: "accepted",
          },
          {
            id: "b",
            requesterId: "bob",
            recipientId: "me",
            status: "accepted",
          },
          { id: "c", requesterId: "me", recipientId: "eve", status: "pending" },
        ],
        "me",
      ),
    ).toEqual(["bob"]);
  });
  it("reuses a stable send request ID for safe message retries", async () => {
    const api = fake();
    const s = makeChatsService(api);
    await s.sendMessage("chat", "hello", null, "request");
    await s.sendMessage("chat", "hello", null, "request");
    expect(api.rpc).toHaveBeenNthCalledWith(2, "send_message", {
      target_chat: "chat",
      text_body: "hello",
      request_id: "request",
      image_path_value: null,
    });
  });
  it("accepts images but rejects unsupported files and oversized uploads", () => {
    expect(
      imageExtension(new File(["x"], "a.jpg", { type: "image/jpeg" })),
    ).toBe("jpg");
    expect(() =>
      imageExtension(new File(["x"], "a.pdf", { type: "application/pdf" })),
    ).toThrow("JPEG");
    expect(() =>
      imageExtension(
        new File([new Uint8Array(5242881)], "a.png", { type: "image/png" }),
      ),
    ).toThrow("5 MB");
  });
});
