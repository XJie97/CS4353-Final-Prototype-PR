import { useEffect, useState } from "react";
export const PAGES = ["borrow", "share", "loans", "friends", "me"] as const;
export type Page = (typeof PAGES)[number];
export function parseRoute(path: string, search: string) {
  const name = path.replace(/^\//, "");
  return {
    page: (PAGES.includes(name as Page) ? name : "borrow") as Page,
    loanId: new URLSearchParams(search).get("loan"),
  };
}
export function navigate(page: Page, search = "") {
  window.history.pushState(null, "", `/${page}${search}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
export function useRoute() {
  const [route, setRoute] = useState(() =>
    parseRoute(location.pathname, location.search),
  );
  useEffect(() => {
    const fn = () => setRoute(parseRoute(location.pathname, location.search));
    addEventListener("popstate", fn);
    if (!PAGES.some((p) => location.pathname === `/${p}`))
      history.replaceState(
        null,
        "",
        `/borrow${location.search}${location.hash}`,
      );
    return () => removeEventListener("popstate", fn);
  }, []);
  return route;
}
