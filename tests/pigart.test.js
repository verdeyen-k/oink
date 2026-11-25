const test = require('node:test');
const assert = require('node:assert');
const A = require('../pigart.js');
const E = require('../elements.js');

const used = pig => new Set(Object.values(pig.anims).flat(2).filter(Boolean));

test('a blank pig has 3 animations of 4 see-through frames', () => {
  const p = A.blankPig();
  assert.deepStrictEqual(Object.keys(p.anims), ['idle', 'walk', 'attack']);
  for (const a of A.ANIMS) {
    assert.strictEqual(p.anims[a].length, 4);
    assert.strictEqual(p.anims[a][0].length, 1024);
    assert.ok(p.anims[a][0].every(c => c === ''));
  }
});

test('the default pig is drawn in its colour and its animations move', () => {
  const p = A.defaultPig('#ff6b3d');
  assert.ok(used(p).has('#ff6b3d'));
  for (const a of A.ANIMS) assert.notDeepStrictEqual(p.anims[a][0], p.anims[a][1], a);
});

test('encode then decode gives back the same pig', () => {
  const p = A.defaultPig('#4dabf7');
  p.name = 'Splashy';
  const back = A.decodePig(JSON.parse(JSON.stringify(A.encodePig(p))));
  assert.deepStrictEqual(back, p);
});

test('decode refuses broken pigs', () => {
  const good = A.encodePig(A.defaultPig('#4dabf7'));
  const short = JSON.parse(JSON.stringify(good)); short.anims.idle[0] = short.anims.idle[0].slice(1);
  assert.throws(() => A.decodePig(short));
  const noWalk = JSON.parse(JSON.stringify(good)); delete noWalk.anims.walk;
  assert.throws(() => A.decodePig(noWalk));
  const badChar = JSON.parse(JSON.stringify(good)); badChar.anims.idle[0] = '!' + badChar.anims.idle[0].slice(1);
  assert.throws(() => A.decodePig(badChar));
  const nine = JSON.parse(JSON.stringify(good)); nine.anims.idle = Array(9).fill(good.anims.idle[0]);
  assert.throws(() => A.decodePig(nine));
  assert.throws(() => A.decodePig(null));
});

test('main colour skips black even when black is used most', () => {
  const p = A.blankPig();
  const f = p.anims.idle[0];
  for (let i = 0; i < 300; i++) f[i] = '#000000';
  for (let i = 300; i < 400; i++) f[i] = '#ff0000';
  assert.strictEqual(A.mainColor(p), '#ff0000');
  assert.strictEqual(A.mainColor(A.blankPig()), null);
});

test('automatic mix: fire on the left, water on the right', () => {
  const m = A.autoMix('fire+water', {});
  const fire = E.BY_ID.fire.color, water = E.BY_ID.water.color;
  const f = m.anims.idle[0];
  let left = null, right = null;
  for (let x = 0; x < 32 && !left; x++) for (let y = 0; y < 32; y++) { const c = f[y * 32 + x]; if (c === fire || c === water) { left = c; break; } }
  for (let x = 31; x >= 0 && !right; x--) for (let y = 0; y < 32; y++) { const c = f[y * 32 + x]; if (c === fire || c === water) { right = c; break; } }
  assert.strictEqual(left, fire);
  assert.strictEqual(right, water);
});

test('automatic mix uses the hand-drawn colours of one-element pigs', () => {
  const water = A.blankPig();
  water.anims.idle[0].fill('#3399ee', 0, 200);
  const m = A.autoMix('fire+water', { water });
  assert.ok(used(m).has('#3399ee'));
  assert.ok(used(m).has(E.BY_ID.fire.color));
});

test('three elements make three stripes', () => {
  const u = used(A.autoMix('fire+ice+water', {}));
  for (const id of ['fire', 'ice', 'water']) assert.ok(u.has(E.BY_ID[id].color), id);
});

test('resolvePig: drawn pigs win, Mega Boar starts blank', () => {
  const p = A.blankPig();
  assert.deepStrictEqual(A.resolvePig('fire+water', { 'fire+water': p }), { pig: p, auto: false });
  assert.strictEqual(A.resolvePig('fire+water', {}).auto, true);
  assert.strictEqual(A.resolvePig('fire', {}).auto, true);
  const mb = A.resolvePig('megaboar', {});
  assert.strictEqual(used(mb.pig).size, 0);
});
