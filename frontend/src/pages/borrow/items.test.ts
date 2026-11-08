import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterItems,
  sampleItems,
  getSearchSuggestions,
  getBrowseItems,
} from "./items.ts";

const all = { query: "", category: "all", location: "all", friendsOnly: false };

test("search ignores surrounding spaces and letter case", () => {
  // Verify that search trims surrounding whitespace and ignores letter case.
  assert.deepEqual(
    filterItems(sampleItems, { ...all, query: "  pOrTaBlE  " }).map(
      (i) => i.id,
    ),
    ["speaker"],
  );
});

test("item results match the start of the full item name, not an interior word", () => {
  // Verify that an interior brand name does not match the beginning of an item name.
  assert.deepEqual(filterItems(sampleItems, { ...all, query: "JBL" }), []);
  // Verify that an interior letter does not count as a name-prefix match.
  assert.deepEqual(filterItems(sampleItems, { ...all, query: "w" }), []);
  // Verify that an interior word does not count as a name-prefix match.
  assert.deepEqual(filterItems(sampleItems, { ...all, query: "machine" }), []);
});

test("W suggests appropriate borrowable items using only case-insensitive prefixes", () => {
  const suggestions = getSearchSuggestions("  W  ", [
    "Sewing machine",
    "Power washer",
  ]);
  // Verify that the expanded catalog provides several W-prefix suggestions.
  assert.ok(suggestions.length >= 4);
  // Verify that Waffle maker appears among W-prefix suggestions.
  assert.ok(suggestions.includes("Waffle maker"));
  // Verify that Watering can appears among W-prefix suggestions.
  assert.ok(suggestions.includes("Watering can"));
  // Verify that every W suggestion starts with W, ignoring case.
  assert.ok(suggestions.every((value) => value.toLowerCase().startsWith("w")));
  // Verify that W search results all obey the same name-prefix rule.
  assert.ok(
    getBrowseItems({ ...all, query: "w" }).every((item) =>
      item.name.toLowerCase().startsWith("w"),
    ),
  );
});

test("every generated suggestion leads to at least one matching prototype listing", () => {
  for (const query of ["", "ca", "d", "f", "p", "w"]) {
    const suggestions = getSearchSuggestions(query, []);
    // Verify that known prefixes produce at least one suggestion.
    assert.ok(suggestions.length > 0);
    for (const name of suggestions) {
      // Verify that each generated suggestion begins with the requested prefix.
      assert.ok(name.toLowerCase().startsWith(query));
      // Verify that every suggestion leads to at least one actual catalog result.
      assert.ok(getBrowseItems({ ...all, query: name }).length > 0, name);
    }
  }
  // Verify that an unmatched prefix does not suggest unrelated search history.
  assert.deepEqual(getSearchSuggestions("zzzzzz", ["Sewing machine"]), []);
});

test("category, location and friend restrictions combine", () => {
  // Verify that category, community, and friends-only filters apply together.
  assert.deepEqual(
    filterItems(sampleItems, {
      query: "",
      category: "Electronics",
      location: "Clementi",
      friendsOnly: true,
    }).map((i) => i.id),
    ["speaker"],
  );
});

test("unmatched search is empty and clearing filters restores all items", () => {
  // Verify that an unmatched item name produces an empty result list.
  assert.equal(
    filterItems(sampleItems, { ...all, query: "nonexistent item" }).length,
    0,
  );
  // Verify that clearing restrictions returns all six sample items.
  assert.equal(filterItems(sampleItems, all).length, 6);
  // Verify that filtering never removes items from the source catalog.
  assert.equal(sampleItems.length, 6);
});

test('"Available now" hides items that are out on loan today, and combines with other filters', () => {
  const items = [
    { id: 'a', name: 'Drill', category: 'Tools', location: 'Clementi', isFriend: true, image: '', availability: 'available' as const },
    { id: 'b', name: 'Drum', category: 'Tools', location: 'Clementi', isFriend: false, image: '', availability: 'on-loan' as const, backOn: '2026-11-12' },
    { id: 'c', name: 'Dryer', category: 'Home', location: 'Clementi', isFriend: true, image: '', availability: 'booked' as const },
    { id: 'd', name: 'Desk', category: 'Home', location: 'Clementi', isFriend: false, image: '' },
  ];
  assert.deepEqual(filterItems(items, { ...all, availableNow: true }).map(i => i.id), ['a', 'c', 'd']);
  assert.deepEqual(filterItems(items, { ...all, availableNow: true, friendsOnly: true }).map(i => i.id), ['a', 'c']);
  assert.equal(filterItems(items, all).length, 4);
});
