import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialBorrowState, borrowReducer } from './flow.ts';
import { getBrowseItems, getSearchSuggestions, itemCatalog } from './items.ts';

test('canceling a draft search leaves the submitted query unchanged', () => {
  let state = borrowReducer(initialBorrowState, { type: 'submit-search', query: 'Cake stand' });
  state = borrowReducer(state, { type: 'open-search' });
  state = borrowReducer(state, { type: 'edit-search', value: 'Tent' });
  state = borrowReducer(state, { type: 'close-search' });
  assert.equal(state.filters.query, 'Cake stand');
  assert.equal(state.view, 'browse');
});

test('the cake-stand search, Party Supplies, Clementi and item details form one flow', () => {
  let state = borrowReducer(initialBorrowState, { type: 'submit-search', query: '  Cake stand  ' });
  assert.equal(getBrowseItems(state.filters).length, 2);
  state = borrowReducer(state, { type: 'set-category', value: 'Party Supplies' });
  state = borrowReducer(state, { type: 'set-location', value: 'Clementi' });
  state = borrowReducer(state, { type: 'toggle-friends' });
  assert.equal(getBrowseItems(state.filters).length, 2);
  assert.ok(getBrowseItems(state.filters).every(i => i.location === 'Clementi' && i.isFriend));
  state = borrowReducer(state, { type: 'open-item', id: 'cake-stand' });
  assert.equal(state.view, 'details');
  const cake = itemCatalog.find(i => i.id === state.itemId)!;
  assert.equal(cake.owner, 'Sarah');
  assert.ok(cake.description?.includes('lovely baked cakes'));
  state = borrowReducer(state, { type: 'back-to-results' });
  assert.equal(state.filters.query, 'Cake stand');
  assert.equal(state.filters.category, 'Party Supplies');
  assert.equal(state.filters.location, 'Clementi');
  assert.equal(state.filters.friendsOnly, true);
});

test('search suggestions use item-name prefixes and learn submitted queries without duplicates', () => {
  assert.ok(getSearchSuggestions('Ca', []).every(name => name.toLowerCase().startsWith('ca')));
  let state = borrowReducer(initialBorrowState, { type: 'submit-search', query: 'Cake stand' });
  state = borrowReducer(state, { type: 'submit-search', query: 'cake STAND' });
  assert.equal(state.recentSearches.length, 1);
  assert.equal(getSearchSuggestions('cake', state.recentSearches)[0], 'cake STAND');
});

test('empty results reset to the home screen without a stale item selection', () => {
  let state = borrowReducer(initialBorrowState, { type: 'submit-search', query: 'not in the catalog' });
  assert.equal(getBrowseItems(state.filters).length, 0);
  state = borrowReducer(state, { type: 'reset' });
  assert.equal(state.view, 'browse');
  assert.equal(state.filters.query, '');
  assert.equal(getBrowseItems(state.filters).length, 6);
  assert.equal(state.itemId, null);
});
