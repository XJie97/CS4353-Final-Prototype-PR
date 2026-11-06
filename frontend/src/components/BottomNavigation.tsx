import { Icon } from "./Icon";
import { Glyph } from "./ui/shared";
import type { Page } from "../app/routes";
export function BottomNavigation({
  onBorrow,
  active = "borrow",
  onNavigate,
}: {
  onBorrow?: () => void;
  active?: Page;
  onNavigate?: (page: Page) => void;
}) {
  const tabs = [
    { page: "borrow" as const, label: "Borrow", icon: "shirt", width: 20 },
    {
      page: "share" as const,
      label: "Share",
      icon: "share",
      width: 31.433,
      height: 23,
    },
    {
      page: "loans" as const,
      label: "Loans",
      icon: "loans",
      width: 23.852,
      height: 23,
    },
    {
      page: "friends" as const,
      label: "Friends",
      icon: "friends",
      width: 39.277,
      height: 23,
    },
    { page: "me" as const, label: "Me", icon: "user", width: 24 },
  ];
  return (
    <nav className="bottom-navigation" aria-label="Main navigation">
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.page}
          className={`navigation-tab ${active === tab.page ? "navigation-tab--selected" : ""}`}
          aria-current={active === tab.page ? "page" : undefined}
          onClick={() =>
            tab.page === "borrow" && onBorrow
              ? onBorrow()
              : onNavigate?.(tab.page)
          }
          disabled={!onNavigate && tab.page !== "borrow"}
        >
          {tab.page === "borrow" ? (
            <Glyph name="borrow" size={24} />
          ) : (
            <Icon name={tab.icon} width={tab.width} height={tab.height} />
          )}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
