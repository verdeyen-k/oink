const test = require('node:test');
const assert = require('node:assert');
const R = require('../rules.js');

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('damage: x2 when the attack beats, x0.5 when beaten, common is x1', () => {
  assert.strictEqual(R.damageMult('fire', ['ice']), 2);
  assert.strictEqual(R.damageMult('ice', ['fire']), 0.5);
  assert.strictEqual(R.damageMult('fire', ['ice', 'plant']), 2);
  assert.strictEqual(R.damageMult('fire', ['ice', 'water']), 1);
  assert.strictEqual(R.damageMult('common', ['fire']), 1);
  assert.strictEqual(R.damageMult('fire', ['common']), 1);
});

test('every element has an attack from the table', () => {
  assert.deepStrictEqual(Object.keys(R.ATTACKS).sort(), ['air', 'common', 'dark', 'electric', 'fire', 'ice', 'plant', 'rock', 'water']);
  assert.deepStrictEqual([R.ATTACKS.rock.speed, R.ATTACKS.rock.damage, R.ATTACKS.rock.every, R.ATTACKS.rock.reach], [260, 22, 1.2, 450]);
  assert.strictEqual(R.ATTACKS.ice.slow, 1.5);
  assert.strictEqual(R.ATTACKS.plant.root, 0.8);
});

test('a new barn has the 9 one-element pigs', () => {
  const b = R.newBarn();
  assert.deepStrictEqual(b.pigs.map(p => p.key), ['fire', 'ice', 'plant', 'rock', 'air', 'electric', 'dark', 'water', 'common']);
  assert.strictEqual(new Set(b.pigs.map(p => p.id)).size, 9);
});

test('merging', () => {
  const b = R.newBarn();
  const id = k => b.pigs.find(p => p.key === k).id;
  assert.deepStrictEqual(R.mergeResult(b, id('water'), id('fire')), { ok: true, key: 'fire+water' });
  const b2 = R.merge(b, id('water'), id('fire'));
  assert.strictEqual(b2.pigs.length, 8);
  assert.ok(b2.pigs.some(p => p.key === 'fire+water'));
  assert.strictEqual(b.pigs.length, 9, 'old barn untouched');
  const fw = b2.pigs.find(p => p.key === 'fire+water').id;
  assert.strictEqual(R.mergeResult(b2, fw, b2.pigs.find(p => p.key === 'plant').id).ok, false);
  const b3 = R.rewardPig(b2, () => 7 / 9 + 0.01).barn; // a water pig
  assert.strictEqual(R.mergeResult(b3, fw, b3.pigs.find(p => p.key === 'water').id).ok, false); // nothing new
  assert.strictEqual(R.mergeResult(b2, fw, fw).ok, false);
  const small = { nextId: 9, pigs: [{ id: 1, key: 'fire' }, { id: 2, key: 'ice' }, { id: 3, key: 'rock' }] };
  assert.strictEqual(R.mergeResult(small, 1, 2).ok, false); // would leave 2 pigs
});

test('rewards add a random one-element pig', () => {
  const { barn, key } = R.rewardPig(R.newBarn(), () => 0);
  assert.strictEqual(key, 'fire');
  assert.strictEqual(barn.pigs.length, 10);
});

test('loading a broken save starts fresh', () => {
  for (const bad of [null, '', 'junk', '{"pigs":5}', '{"pigs":[{"id":1,"key":"banana"}]}'])
    assert.strictEqual(R.loadBarn(bad).pigs.length, 9, String(bad));
  const b = R.merge(R.newBarn(), 1, 8);
  assert.deepStrictEqual(R.loadBarn(JSON.stringify(b)), b);
});

test('mega boar gets every element once', () => {
  assert.deepStrictEqual(R.megaElements(['fire+water', 'fire', 'ice']), ['fire', 'ice', 'water']);
});

test('computer team: 3 real pigs', () => {
  for (const lv of R.LEVELS) {
    const t = R.computerTeam(lv, ['fire', 'ice', 'plant'], Math.random);
    assert.strictEqual(t.length, 3);
    for (const k of t) assert.ok(require('../elements.js').allPigKeys().includes(k), k);
  }
});

test('pairing: everyone once, odd one sits out', () => {
  const { pairs, sitOut } = R.pairUp([1, 2, 3, 4, 5], Math.random);
  assert.strictEqual(pairs.length, 2);
  assert.notStrictEqual(sitOut, null);
  assert.deepStrictEqual([...pairs.flat(), sitOut].sort(), [1, 2, 3, 4, 5]);
  assert.strictEqual(R.pairUp([1, 2], Math.random).sitOut, null);
});

test('quick win chance favours the better matchup', () => {
  assert.ok(R.quickWinChance('fire', 'ice') > 0.5);
  assert.ok(R.quickWinChance('ice', 'fire') < 0.5);
  assert.strictEqual(R.quickWinChance('common', 'fire'), 0.5);
});
