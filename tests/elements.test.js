const test = require('node:test');
const assert = require('node:assert');
const E = require('../elements.js');

test('45 pigs: 9 singles and 36 pairs (2 elements max)', () => {
  const keys = E.allPigKeys();
  assert.strictEqual(keys.length, 45);
  const n = k => keys.filter(x => x.split('+').length === k).length;
  assert.deepStrictEqual([n(1), n(2), n(3)], [9, 36, 0]);
  assert.strictEqual(new Set(keys).size, 45);
});

test('each element beats only the next one around the circle', () => {
  assert.ok(E.beats('fire', 'ice'));
  assert.ok(E.beats('water', 'fire'));
  assert.ok(!E.beats('fire', 'plant'));
  assert.ok(!E.beats('ice', 'fire'));
});

test('common beats nothing and nothing beats it', () => {
  for (const e of E.ELEMENTS) {
    assert.ok(!E.beats('common', e.id));
    assert.ok(!E.beats(e.id, 'common'));
  }
});

test('order does not matter', () => {
  assert.strictEqual(E.pigKey(['water', 'fire']), 'fire+water');
  assert.strictEqual(E.pigKey(['common', 'ice', 'ice']), 'ice+common');
});

test('merging', () => {
  assert.strictEqual(E.mergeKey('fire', 'water'), 'fire+water');
  assert.strictEqual(E.mergeKey('fire+water', 'water'), 'fire+water');
  assert.strictEqual(E.mergeKey('fire+water', 'fire+plant'), null);
  assert.strictEqual(E.mergeKey('fire', 'ice+plant'), null);
  assert.strictEqual(E.mergeKey('fire', 'fire'), 'fire');
});

test('labels', () => {
  assert.strictEqual(E.pigLabel('fire+water'), '🔥💧');
  assert.strictEqual(E.pigLabel('megaboar'), '🐗');
});
