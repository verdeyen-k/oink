const test = require('node:test');
const assert = require('node:assert');
const A = require('../pigart.js');
const E = require('../elements.js');

function dot(x, y, c = '#ff0000') { const f = A.blankFrame(); f[y * 32 + x] = c; return f; }
const find = (f, c) => { const i = f.indexOf(c); return i < 0 ? null : [i % 32, Math.floor(i / 32)]; };

test('a blank pig is one see-through 32x32 picture', () => {
  const p = A.blankPig();
  assert.strictEqual(p.picture.length, 1024);
  assert.ok(p.picture.every(c => c === ''));
  assert.ok(!A.isDrawn(p));
});

test('the plain pig is drawn in its colour', () => {
  const p = A.plainPig('#ff6b3d');
  assert.ok(p.picture.includes('#ff6b3d'));
  assert.ok(A.isDrawn(p));
});

test('animate makes idle, walk and attack with 4 frames each', () => {
  const anims = A.animate(A.plainPig('#4dabf7').picture);
  assert.deepStrictEqual(Object.keys(anims), ['idle', 'walk', 'attack']);
  for (const a of A.ANIMS) {
    assert.strictEqual(anims[a].length, 4, a);
    assert.ok(anims[a].every(f => f.length === 1024), a);
  }
  assert.notDeepStrictEqual(anims.walk[0], anims.walk[2]);
});

test('idle bobs down 1 pixel, attack only ever moves right', () => {
  const anims = A.animate(dot(10, 5));
  assert.deepStrictEqual(find(anims.idle[0], '#ff0000'), [10, 5]);
  assert.deepStrictEqual(find(anims.idle[2], '#ff0000'), [10, 6]);
  assert.deepStrictEqual(find(anims.attack[1], '#ff0000'), [12, 5]);
  assert.deepStrictEqual(find(anims.attack[2], '#ff0000'), [14, 5]);
  assert.deepStrictEqual(find(anims.attack[3], '#ff0000'), [12, 5]);
});

test('walk: the legs scissor, the body bobs', () => {
  const f = A.blankFrame();
  for (let y = 0; y < 8; y++) for (let x = 10; x < 20; x++) f[y * 32 + x] = '#00ff00'; // body
  f[3 * 32 + 15] = '#ffff00'; // a body pixel
  f[7 * 32 + 11] = '#ff0000'; // a back leg pixel (bottom quarter, left half)
  f[7 * 32 + 18] = '#0000ff'; // a front leg pixel (bottom quarter, right half)
  const w = A.animate(f).walk;
  assert.deepStrictEqual(find(w[0], '#ff0000'), [10, 7]);
  assert.deepStrictEqual(find(w[0], '#0000ff'), [19, 7]);
  assert.deepStrictEqual(find(w[2], '#ff0000'), [12, 7]);
  assert.deepStrictEqual(find(w[2], '#0000ff'), [17, 7]);
  assert.deepStrictEqual(find(w[1], '#ffff00'), [15, 2]); // body bobs up 1
  assert.deepStrictEqual(find(w[1], '#ff0000'), [11, 7]); // legs stay on the ground
});

test('pixels moved off the edge are dropped, not wrapped', () => {
  const anims = A.animate(dot(31, 31));
  assert.strictEqual(find(anims.attack[2], '#ff0000'), null);
  assert.strictEqual(anims.attack[2].filter(Boolean).length, 0);
});

test('a blank picture makes blank animations', () => {
  const anims = A.animate(A.blankFrame());
  for (const a of A.ANIMS) assert.ok(anims[a].every(f => f.every(c => c === '')));
});

test('encode then decode gives back the same pig', () => {
  const p = A.plainPig('#4dabf7');
  p.name = 'Splashy';
  assert.deepStrictEqual(A.decodePig(JSON.parse(JSON.stringify(A.encodePig(p)))), p);
});

test('decode refuses broken pigs', () => {
  const good = A.encodePig(A.plainPig('#4dabf7'));
  const copy = () => JSON.parse(JSON.stringify(good));
  const short = copy(); short.picture = short.picture.slice(1);
  const badChar = copy(); badChar.picture = '!' + badChar.picture.slice(1);
  const badColour = copy(); badColour.palette[0] = 'red';
  const noPic = copy(); delete noPic.picture;
  for (const bad of [short, badChar, badColour, noPic, null, 'pig']) assert.throws(() => A.decodePig(bad));
});

test('pigs.js files: export then load', () => {
  const pigs = { 'fire+water': A.plainPig('#ff6b3d'), megaboar: A.plainPig('#222222') };
  pigs['fire+water'].name = 'Steamy';
  const text = A.exportPigsFile(pigs);
  assert.ok(text.startsWith('window.OINK_PIGS = '));
  assert.deepStrictEqual(A.parsePigsFile(text), pigs);
  assert.deepStrictEqual(A.parsePigsFile(JSON.stringify(JSON.parse(text.slice(19, -2)))), pigs); // plain .json works too
});

test('pigs.js files: blank pigs are not exported', () => {
  const text = A.exportPigsFile({ fire: A.blankPig(), ice: A.plainPig('#a5e8ff') });
  assert.deepStrictEqual(Object.keys(A.parsePigsFile(text)), ['ice']);
});

test('pigs.js files: bad files are refused', () => {
  assert.throws(() => A.parsePigsFile('hello'));
  assert.throws(() => A.parsePigsFile('window.OINK_PIGS = [];'));
  const good = A.encodePig(A.plainPig('#ff6b3d'));
  assert.throws(() => A.parsePigsFile(JSON.stringify({ 'fire+ice+plant': good })));
  assert.throws(() => A.parsePigsFile(JSON.stringify({ fire: { palette: [] } })));
  assert.ok(E.allPigKeys().includes('fire'));
});

test('legLine: the first row of legs is the bottom quarter of the drawing', () => {
  const f = A.blankFrame();
  for (let y = 10; y < 18; y++) f[y * 32 + 5] = '#ff0000'; // rows 10..17, 8 tall
  assert.strictEqual(A.legLine(f), 16);
  assert.strictEqual(A.legLine(A.blankFrame()), null);
});
