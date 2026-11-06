export type Page =
  "borrow" | "share" | "loans" | "friends" | "me" | "chats" | "notifications";
export type Route = { page: Page; id?: string };
export function parseRoute(hash: string): Route {
  try {
    const [page, id] = hash
      .replace(/^#/, "")
      .split("/")
      .map(decodeURIComponent);
    if (
      ![
        "borrow",
        "share",
        "loans",
        "friends",
        "me",
        "chats",
        "notifications",
      ].includes(page)
    )
      return { page: "borrow" };
    return { page: page as Page, ...(id && page !== "borrow" ? { id } : {}) };
  } catch {
    return { page: "borrow" };
  }
}
