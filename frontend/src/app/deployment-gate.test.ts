import test from 'node:test';
import assert from 'node:assert/strict';
test('temporary deployment gate verification', () => {
  assert.fail('Intentional preview-only failure to verify deployment gating.');
});
