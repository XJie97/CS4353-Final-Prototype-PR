import assert from "node:assert/strict";
import { test } from "node:test";
import { initialBorrowState, borrowReducer } from "./flow.ts";
import { getBrowseItems, getSearchSuggestions, itemCatalog } from "./items.ts";

test("canceling a draft search leaves the submitted query unchanged", () => {
  let state = borrowReducer(initialBorrowState, {
    type: "submit-search",
    query: "Cake stand",
  });
  state = borrowReducer(state, { type: "open-search" });
  state = borrowReducer(state, { type: "edit-search", value: "Tent" });
  state = borrowReducer(state, { type: "close-search" });
  // Verify that canceling a search draft preserves the submitted query.
  assert.equal(state.filters.query, "Cake stand");
  // Verify that canceling search returns to the browse view.
  assert.equal(state.view, "browse");
});

test("the cake-stand search, Party Supplies, Clementi and item details form one flow", () => {
  let state = borrowReducer(initialBorrowState, {
    type: "submit-search",
    query: "  Cake stand  ",
  });
  // Verify that the initial cake-stand query returns the two matching listings.
  assert.equal(getBrowseItems(state.filters).length, 2);
  state = borrowReducer(state, {
    type: "set-category",
    value: "Party Supplies",
  });
  state = borrowReducer(state, { type: "set-location", value: "Clementi" });
  state = borrowReducer(state, { type: "toggle-friends" });
  // Verify that the combined filters still return the intended two items.
  assert.equal(getBrowseItems(state.filters).length, 2);
  // Verify that every result satisfies both the Clementi and friends-only restrictions.
  assert.ok(
    getBrowseItems(state.filters).every(
      (i) => i.location === "Clementi" && i.isFriend,
    ),
  );
  state = borrowReducer(state, { type: "open-item", id: "cake-stand" });
  // Verify that opening a card enters the detail view.
  assert.equal(state.view, "details");
  const cake = itemCatalog.find((i) => i.id === state.itemId)!;
  // Verify that the selected cake stand displays its correct owner.
  assert.equal(cake.owner, "Sarah");
  // Verify that the selected item retains its descriptive listing text.
  assert.ok(cake.description?.includes("lovely baked cakes"));
  state = borrowReducer(state, { type: "back-to-results" });
  // Verify that returning from details preserves the submitted search query.
  assert.equal(state.filters.query, "Cake stand");
  // Verify that returning from details preserves the category filter.
  assert.equal(state.filters.category, "Party Supplies");
  // Verify that returning from details preserves the community location filter.
  assert.equal(state.filters.location, "Clementi");
  // Verify that returning from details preserves the friends-only filter.
  assert.equal(state.filters.friendsOnly, true);
});

test("search suggestions use item-name prefixes and learn submitted queries without duplicates", () => {
  // Verify that suggestions match the start of the item name, ignoring case.
  assert.ok(
    getSearchSuggestions("Ca", []).every((name) =>
      name.toLowerCase().startsWith("ca"),
    ),
  );
  let state = borrowReducer(initialBorrowState, {
    type: "submit-search",
    query: "Cake stand",
  });
  state = borrowReducer(state, { type: "submit-search", query: "cake STAND" });
  // Verify that repeated searches with different case do not duplicate history entries.
  assert.equal(state.recentSearches.length, 1);
  // Verify that learned search history keeps the latest submitted spelling first.
  assert.equal(
    getSearchSuggestions("cake", state.recentSearches)[0],
    "cake STAND",
  );
});

test("empty results reset to the home screen without a stale item selection", () => {
  let state = borrowReducer(initialBorrowState, {
    type: "submit-search",
    query: "not in the catalog",
  });
  // Verify that an unmatched query has no browse results.
  assert.equal(getBrowseItems(state.filters).length, 0);
  state = borrowReducer(state, { type: "reset" });
  // Verify that clearing filters restores the browse view.
  assert.equal(state.view, "browse");
  // Verify that reset clears the submitted search query.
  assert.equal(state.filters.query, "");
  // Verify that reset restores all six catalog items.
  assert.equal(getBrowseItems(state.filters).length, 6);
  // Verify that reset clears the stale detail-item selection.
  assert.equal(state.itemId, null);
});

test('the "Available now" toggle switches on and off, and reset clears it', () => {
  let state = borrowReducer(initialBorrowState, { type: 'toggle-available' });
  assert.equal(state.filters.availableNow, true);
  state = borrowReducer(state, { type: 'toggle-available' });
  assert.equal(state.filters.availableNow, false);
  state = borrowReducer(borrowReducer(state, { type: 'toggle-available' }), { type: 'reset' });
  assert.equal(state.filters.availableNow, false);
});
