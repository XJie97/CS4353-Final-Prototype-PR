import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterItems, sampleItems } from './items.ts';

const all = { query: '', category: 'all', location: 'all', friendsOnly: false };

test('search ignores surrounding spaces and letter case', () => {
  assert.deepEqual(filterItems(sampleItems, { ...all, query: '  JBL  ' }).map(i => i.id), ['speaker']);
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
