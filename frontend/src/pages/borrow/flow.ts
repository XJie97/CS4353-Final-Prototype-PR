import { allItems, type BorrowFilters } from "./items.ts";

export type BorrowState = {
  view: "browse" | "search" | "details";
  filters: BorrowFilters;
  draftQuery: string;
  recentSearches: string[];
  itemId: string | null;
  selectedMapId: string;
};
export const initialBorrowState: BorrowState = {
  view: "browse",
  filters: {
    query: "",
    category: "all",
    location: "all",
    friendsOnly: false,
    availableNow: false,
  },
  draftQuery: "",
  recentSearches: [],
  itemId: null,
  selectedMapId: "jacket",
};
export type BorrowAction =
  | {
      type:
        | "open-search"
        | "close-search"
        | "back-to-results"
        | "toggle-friends"
        | "toggle-available"
        | "reset";
    }
  | { type: "edit-search" | "set-category" | "set-location"; value: string }
  | { type: "submit-search"; query: string }
  | {
      type: "open-item" | "select-map-item";
      id: string;
      knownItemIds?: string[];
    };

export function borrowReducer(
  state: BorrowState,
  action: BorrowAction,
): BorrowState {
  switch (action.type) {
    case "open-search":
      return { ...state, view: "search", draftQuery: state.filters.query };
    case "edit-search":
      return { ...state, draftQuery: action.value };
    case "close-search":
      return { ...state, view: "browse", draftQuery: state.filters.query };
    case "submit-search": {
      const query = action.query.trim();
      const recentSearches = query
        ? [
            query,
            ...state.recentSearches.filter(
              (value) =>
                value.toLocaleLowerCase() !== query.toLocaleLowerCase(),
            ),
          ].slice(0, 8)
        : state.recentSearches;
      return {
        ...state,
        view: "browse",
        filters: { ...state.filters, query },
        draftQuery: query,
        recentSearches,
        selectedMapId: query ? "cake-nearby" : "jacket",
      };
    }
    case "set-category":
      return {
        ...state,
        filters: { ...state.filters, category: action.value },
      };
    case "set-location":
      return {
        ...state,
        filters: { ...state.filters, location: action.value },
      };
    case "toggle-friends":
      return {
        ...state,
        filters: { ...state.filters, friendsOnly: !state.filters.friendsOnly },
      };
    case "toggle-available":
      return {
        ...state,
        filters: {
          ...state.filters,
          availableNow: !state.filters.availableNow,
        },
      };
    case "select-map-item":
      return { ...state, selectedMapId: action.id };
    case "open-item":
      return allItems.some((item) => item.id === action.id) ||
        action.knownItemIds?.includes(action.id)
        ? { ...state, view: "details", itemId: action.id }
        : state;
    case "back-to-results":
      return { ...state, view: "browse", itemId: null };
    case "reset":
      return { ...initialBorrowState, recentSearches: state.recentSearches };
  }
}
