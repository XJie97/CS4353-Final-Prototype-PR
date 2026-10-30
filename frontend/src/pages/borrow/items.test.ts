import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterItems, sampleItems, getSearchSuggestions, getBrowseItems } from './items.ts';

const all = { query: '', category: 'all', location: 'all', friendsOnly: false };

test('search ignores surrounding spaces and letter case', () => {
  assert.deepEqual(filterItems(sampleItems, { ...all, query: '  pOrTaBlE  ' }).map(i => i.id), ['speaker']);
});

test('item results match the start of the full item name, not an interior word', () => {
  assert.deepEqual(filterItems(sampleItems, { ...all, query: 'JBL' }), []);
  assert.deepEqual(filterItems(sampleItems, { ...all, query: 'w' }), []);
  assert.deepEqual(filterItems(sampleItems, { ...all, query: 'machine' }), []);
});

test('W suggests appropriate borrowable items using only case-insensitive prefixes', () => {
  const suggestions = getSearchSuggestions('  W  ', ['Sewing machine', 'Power washer']);
  assert.ok(suggestions.length >= 4);
  assert.ok(suggestions.includes('Waffle maker'));
  assert.ok(suggestions.includes('Watering can'));
  assert.ok(suggestions.every(value => value.toLowerCase().startsWith('w')));
  assert.ok(getBrowseItems({ ...all, query: 'w' }).every(item => item.name.toLowerCase().startsWith('w')));
});

test('every generated suggestion leads to at least one matching prototype listing', () => {
  for (const query of ['', 'ca', 'd', 'f', 'p', 'w']) {
    const suggestions = getSearchSuggestions(query, []);
    assert.ok(suggestions.length > 0);
    for (const name of suggestions) {
      assert.ok(name.toLowerCase().startsWith(query));
      assert.ok(getBrowseItems({ ...all, query: name }).length > 0, name);
    }
  }
  assert.deepEqual(getSearchSuggestions('zzzzzz', ['Sewing machine']), []);
});

test('category, location and friend restrictions combine', () => {
  assert.deepEqual(filterItems(sampleItems, {
    query: '', category: 'Electronics', location: 'Clementi', friendsOnly: true,
  }).map(i => i.id), ['speaker']);
});

test('unmatched search is empty and clearing filters restores all items', () => {
  assert.equal(filterItems(sampleItems, { ...all, query: 'nonexistent item' }).length, 0);
  assert.equal(filterItems(sampleItems, all).length, 6);
  assert.equal(sampleItems.length, 6);
});
