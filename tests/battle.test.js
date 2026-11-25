const test = require('node:test');
const assert = require('node:assert');
const B = require('../battle.js');
const AI = require('../ai.js');
const R = require('../rules.js');

function seeded(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const still = (x = 0, y = 0) => ({ mx: 0, my: 0, aimX: x, aimY: y, attack: false, switchEl: false });
const fighter = (key, mega) => ({ key, elements: key.split('+'), mega });
function open(a, b) { // no rocks, pigs facing each other 300px apart
  const s = B.createBattle({ a: fighter(a), b: fighter(b) }, seeded(1), { rocks: [] });
  s.pigs[0].x = 300; s.pigs[0].y = 300; s.pigs[1].x = 600; s.pigs[1].y = 300;
  return s;
}
const run = (s, secs, inputs) => { for (let t = 0; t < secs; t += 1 / 30) B.step(s, 1 / 30, inputs(s)); };

test('a shot hits a still enemy and does damage x multiplier', () => {
  const s = open('fire', 'ice');
  B.step(s, 1 / 30, [{ ...still(600, 300), attack: true }, still()]);
  run(s, 1, () => [still(600, 300), still()]);
  assert.strictEqual(s.pigs[1].hp, 100 - 10 * 2);
});

test('ice slows, vine holds still, gust pushes', () => {
  let s = open('ice', 'common');
  B.step(s, 1 / 30, [{ ...still(600, 300), attack: true }, still()]);
  run(s, 0.8, () => [still(600, 300), still()]);
  assert.ok(s.pigs[1].slowT > 0);
  s = open('plant', 'common');
  s.pigs[1].x = 450; // vines only reach 220
  B.step(s, 1 / 30, [{ ...still(450, 300), attack: true }, still()]);
  run(s, 0.5, () => [still(450, 300), still()]);
  assert.ok(s.pigs[1].rootT > 0);
  const x = s.pigs[1].x;
  run(s, 0.2, () => [still(600, 300), { ...still(), mx: 1 }]);
  assert.strictEqual(s.pigs[1].x, x, 'rooted pigs cannot walk');
  s = open('air', 'common');
  B.step(s, 1 / 30, [{ ...still(600, 300), attack: true }, still()]);
  run(s, 0.8, () => [still(600, 300), still()]);
  assert.ok(s.pigs[1].x > 600);
});

test('shots disappear at the edge and on rocks', () => {
  let s = open('rock', 'common');
  B.step(s, 1 / 30, [{ ...still(0, 300), attack: true }, still()]);
  run(s, 3, () => [still(0, 300), still()]);
  assert.strictEqual(s.shots.length, 0);
  s = B.createBattle({ a: fighter('rock'), b: fighter('common') }, seeded(1), { rocks: [{ x: 450, y: 300, r: 30 }] });
  s.pigs[0].x = 300; s.pigs[0].y = 300; s.pigs[1].x = 600; s.pigs[1].y = 300;
  B.step(s, 1 / 30, [{ ...still(600, 300), attack: true }, still()]);
  run(s, 2, () => [still(600, 300), still()]);
  assert.strictEqual(s.pigs[1].hp, 100);
  assert.strictEqual(s.shots.length, 0);
});

test('pigs cannot walk through rocks or out of the arena', () => {
  const s = B.createBattle({ a: fighter('fire'), b: fighter('ice') }, seeded(1), { rocks: [{ x: 400, y: 300, r: 30 }] });
  s.pigs[0].x = 300; s.pigs[0].y = 300;
  run(s, 2, () => [{ ...still(), mx: 1 }, still()]);
  assert.ok(s.pigs[0].x <= 400 - 30 - s.pigs[0].r + 0.01);
  run(s, 5, () => [{ ...still(), my: -1 }, still()]);
  assert.ok(s.pigs[0].y >= s.pigs[0].r);
});

test('switching goes through the pig\'s elements, once per press', () => {
  const s = open('fire+water', 'ice');
  B.step(s, 1 / 30, [{ ...still(), switchEl: true }, still()]);
  B.step(s, 1 / 30, [{ ...still(), switchEl: true }, still()]);
  assert.strictEqual(s.pigs[0].elements[s.pigs[0].el], 'water');
  B.step(s, 1 / 30, [still(), still()]);
  B.step(s, 1 / 30, [{ ...still(), switchEl: true }, still()]);
  assert.strictEqual(s.pigs[0].elements[s.pigs[0].el], 'fire');
});

test('same-step knockout: more health left wins, never both', () => {
  const s = open('fire', 'fire');
  s.pigs[0].hp = -2; s.pigs[1].hp = -5;
  B.step(s, 1 / 30, [still(), still()]);
  assert.strictEqual(s.winner, 0);
  const d = open('fire', 'fire'); d.pigs[0].hp = 0; d.pigs[1].hp = 0;
  B.step(d, 1 / 30, [still(), still()]);
  assert.strictEqual(d.winner, 'draw');
});

test('time runs out after 90 seconds: bigger share of health wins', () => {
  const s = B.createBattle({ a: fighter('fire', true), b: fighter('ice') }, seeded(2), { rocks: [] });
  assert.strictEqual(s.pigs[0].maxHp, 300);
  s.pigs[0].hp = 150; s.pigs[1].hp = 60;
  run(s, 91, () => [still(), still()]);
  assert.strictEqual(s.winner, 1);
});

test('Insane beats Very Easy at least 8 times out of 10', () => {
  let wins = 0;
  for (let g = 0; g < 10; g++) {
    const rng = seeded(100 + g);
    const s = B.createBattle({ a: fighter('fire'), b: fighter('fire') }, rng);
    const mem = [{}, {}];
    let t = 0;
    while (s.winner === null && t < 100) {
      B.step(s, 1 / 30, [AI.input(s, 0, 'insane', rng, mem[0]), AI.input(s, 1, 'veryeasy', rng, mem[1])]);
      t += 1 / 30;
    }
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 8, `won ${wins}`);
});

test('the computer switches to its best element on Insane', () => {
  const s = open('ice+fire', 'plant');
  s.pigs[1].elements = ['plant']; // ice beats plant, fire doesn't
  const mem = {};
  for (let i = 0; i < 20; i++) B.step(s, 1 / 30, [AI.input(s, 0, 'insane', Math.random, mem), still()]);
  assert.strictEqual(s.pigs[0].elements[s.pigs[0].el], 'ice');
  assert.ok(R.damageMult('ice', ['plant']) > 1);
});
