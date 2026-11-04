import type { Store, CommandEnv, Command } from "./domain.ts";
import { AppError, validDate } from "./validation.ts";
export type HelpRequest = {
  id: string;
  borrowerId: string;
  title: string;
  description: string;
  start: string;
  end: string;
  status: "open" | "closed" | "selected";
  loanId?: string;
};
export type Offer = {
  id: string;
  requestId: string;
  ownerId: string;
  itemId: string;
  withdrawn: boolean;
};
export type HelpCommand =
  | {
      type: "post-help";
      id: string;
      title: string;
      description: string;
      start: string;
      end: string;
    }
  | { type: "close-help"; id: string }
  | { type: "offer-help"; id: string; requestId: string; itemId: string }
  | { type: "withdraw-offer"; id: string }
  | { type: "select-offer"; id: string; loanId: string; lockerId: string };
const check = (ok: unknown, message: string) => {
  if (!ok) throw new AppError(message);
};
// Provisional local policy: any other preview owner may respond with a listed item.
export function applyHelp(
  original: Store,
  c: HelpCommand,
  env: CommandEnv,
  createLoan: (store: Store, command: Command, env: CommandEnv) => Store,
): Store {
  const s = structuredClone(original);
  s.helpRequests ??= [];
  s.offers ??= [];
  const me = s.activeUserId;
  const notify = (to: string, text: string) =>
    s.notices.unshift({
      id: env.id + "-" + s.notices.length,
      to,
      text,
      at: env.now,
      read: false,
    });
  if (c.type === "post-help") {
    check(
      !s.helpRequests.some((r) => r.id === c.id),
      "This request already exists.",
    );
    check(
      c.title.trim() &&
        c.title.length <= 100 &&
        c.description.trim() &&
        c.description.length <= 1000,
      "Enter a title and description within the limits.",
    );
    check(
      validDate(c.start) &&
        validDate(c.end) &&
        c.start >= env.today &&
        c.end >= c.start,
      "Choose a valid future borrowing period.",
    );
    s.helpRequests.unshift({
      id: c.id,
      borrowerId: me,
      title: c.title.trim(),
      description: c.description.trim(),
      start: c.start,
      end: c.end,
      status: "open",
    });
    return s;
  }
  if (c.type === "close-help") {
    const r = s.helpRequests.find((r) => r.id === c.id);
    check(
      r && r.borrowerId === me && r.status === "open",
      "Only the requester can close an open request.",
    );
    r!.status = "closed";
    return s;
  }
  if (c.type === "withdraw-offer") {
    const o = s.offers.find((o) => o.id === c.id);
    const r = s.helpRequests.find((r) => r.id === o?.requestId);
    check(
      o && o.ownerId === me && !o.withdrawn && r?.status === "open",
      "Only the owner can withdraw an active offer.",
    );
    o!.withdrawn = true;
    return s;
  }
  if (c.type === "offer-help") {
    const r = s.helpRequests.find((r) => r.id === c.requestId);
    const item = s.items.find((i) => i.id === c.itemId);
    check(
      r && r.status === "open" && r.borrowerId !== me && r.start >= env.today,
      "This request is no longer available.",
    );
    check(item?.listed && item.ownerId === me, "Offer a listed item you own.");
    check(
      !s.offers.some(
        (o) =>
          o.id === c.id ||
          (o.requestId === c.requestId &&
            o.itemId === c.itemId &&
            !o.withdrawn),
      ),
      "This offer already exists.",
    );
    check(
      !s.loans.some(
        (l) =>
          l.itemId === c.itemId &&
          !["complete", "cancelled", "declined"].includes(l.status) &&
          r!.start <= l.end &&
          r!.end >= l.start,
      ),
      "This item is booked for those dates.",
    );
    s.offers.push({
      id: c.id,
      requestId: c.requestId,
      itemId: c.itemId,
      ownerId: me,
      withdrawn: false,
    });
    notify(r!.borrowerId, "A new offer is available for your help request.");
    return s;
  }
  const o = s.offers.find((o) => o.id === c.id);
  const r = s.helpRequests.find((r) => r.id === o?.requestId);
  check(
    o && !o.withdrawn && r?.status === "open" && r.borrowerId === me,
    "This offer cannot be selected.",
  );
  // Reuse the ordinary loan command: validates availability, dates and duplicate IDs atomically.
  const next = createLoan(
    s,
    {
      type: "request-loan",
      id: c.loanId,
      itemId: o!.itemId,
      start: r!.start,
      end: r!.end,
      lockerId: c.lockerId,
    },
    env,
  );
  const selected = next.helpRequests!.find((v) => v.id === r!.id)!;
  selected.status = "selected";
  selected.loanId = c.loanId;
  return next;
}
