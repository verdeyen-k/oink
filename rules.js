// Oink: the rules. Damage, attacks, the Pig Barn (your pigs + merging), computer teams and Marathon pairing.
// No drawing here. Works in the browser (window.OinkRules, needs elements.js first) and in Node.
(function (root) {
  const E = (typeof module !== 'undefined' && module.exports) ? require('./elements.js') : root.OinkElements;
  const LEVELS = ['veryeasy', 'easy', 'medium', 'hard', 'insane'];
  const LEVEL_NAMES = { veryeasy: 'Very Easy', easy: 'Easy', medium: 'Medium', hard: 'Hard', insane: 'Insane' };
  const SINGLES = E.ELEMENTS.map(e => e.id);
  const TEAM = 3;

  // One attack per element. speed (px/s), damage, every (seconds between shots), reach (px), radius (px).
  const ATTACKS = {
    fire:     { name: 'Fireball',   speed: 520, damage: 10, every: 0.45, reach: 500, radius: 8 },
    ice:      { name: 'Ice shard',  speed: 420, damage: 9,  every: 0.6,  reach: 500, radius: 8, slow: 1.5 },
    plant:    { name: 'Vine',       speed: 360, damage: 10, every: 0.8,  reach: 220, radius: 10, root: 0.8 },
    rock:     { name: 'Boulder',    speed: 260, damage: 22, every: 1.2,  reach: 450, radius: 16 },
    air:      { name: 'Gust',       speed: 600, damage: 7,  every: 0.4,  reach: 400, radius: 12, push: 260 },
    electric: { name: 'Zap',        speed: 900, damage: 8,  every: 0.3,  reach: 260, radius: 6 },
    dark:     { name: 'Ghost ball', speed: 300, damage: 11, every: 0.8,  reach: 600, radius: 10, homing: 2 },
    water:    { name: 'Wave',       speed: 380, damage: 9,  every: 0.7,  reach: 320, radius: 22 },
    common:   { name: 'Headbutt',   speed: 400, damage: 14, every: 0.6,  reach: 70,  radius: 20 },
  };

  // x2 for each defender element the attack beats, x0.5 for each one that beats the attack.
  function damageMult(attackEl, defenderEls) {
    let m = 1;
    for (const d of defenderEls) {
      if (E.beats(attackEl, d)) m *= 2;
      if (E.beats(d, attackEl)) m *= 0.5;
    }
    return m;
  }

  // ---- the Pig Barn ----
  const newBarn = () => ({ nextId: SINGLES.length + 1, pigs: SINGLES.map((key, i) => ({ id: i + 1, key })) });
  const copyBarn = b => ({ nextId: b.nextId, pigs: b.pigs.map(p => ({ ...p })) });

  function mergeResult(barn, idA, idB) {
    const a = barn.pigs.find(p => p.id === idA), b = barn.pigs.find(p => p.id === idB);
    if (!a || !b || idA === idB) return { ok: false, why: 'Pick two different pigs' };
    const key = E.mergeKey(a.key, b.key);
    if (!key) return { ok: false, why: 'Too many elements! A pig can only have 2.' };
    if (key === a.key || key === b.key) return { ok: false, why: "That wouldn't make a new pig" };
    if (barn.pigs.length - 1 < TEAM) return { ok: false, why: 'You need at least 3 pigs for a team' };
    return { ok: true, key };
  }

  function merge(barn, idA, idB) {
    const r = mergeResult(barn, idA, idB);
    if (!r.ok) return barn;
    const b = copyBarn(barn);
    b.pigs = b.pigs.filter(p => p.id !== idA && p.id !== idB);
    b.pigs.push({ id: b.nextId++, key: r.key });
    return b;
  }

  function rewardPig(barn, rng) {
    const key = SINGLES[Math.min(SINGLES.length - 1, Math.floor(rng() * SINGLES.length))];
    const b = copyBarn(barn);
    b.pigs.push({ id: b.nextId++, key });
    return { barn: b, key };
  }

  function loadBarn(text) {
    try {
      const b = JSON.parse(text);
      const keys = new Set(E.allPigKeys());
      if (!b || !Array.isArray(b.pigs) || b.pigs.length < TEAM || typeof b.nextId !== 'number') throw 0;
      const ids = new Set();
      for (const p of b.pigs) {
        if (!p || !keys.has(p.key) || typeof p.id !== 'number' || ids.has(p.id) || p.id >= b.nextId) throw 0;
        ids.add(p.id);
      }
      return { nextId: b.nextId, pigs: b.pigs.map(p => ({ id: p.id, key: p.key })) };
    } catch (e) { return newBarn(); }
  }

  const megaElements = keys => E.pigKey(keys.flatMap(E.keyElements)).split('+');

  // ---- the computer ----
  // How likely pig a beats pig b, from their best attacks against each other.
  function quickWinChance(a, b) {
    const best = (x, y) => Math.max(...E.keyElements(x).map(el => damageMult(el, E.keyElements(y))));
    const pa = best(a, b), pb = best(b, a);
    return pa / (pa + pb);
  }

  function computerTeam(level, playerKeys, rng) {
    const pick = list => list[Math.floor(rng() * list.length)];
    const all = E.allPigKeys();
    if (level === 'veryeasy' || level === 'easy') return [0, 1, 2].map(() => pick(SINGLES));
    if (level === 'medium') return [0, 1, 2].map(() => pick(all));
    // Hard and Insane pick pigs that do well against yours.
    return [0, 1, 2].map(i => {
      const vs = playerKeys[i % playerKeys.length];
      const scored = all.map(k => [k, quickWinChance(k, vs)]).sort((x, y) => y[1] - x[1]);
      return pick(scored.slice(0, level === 'insane' ? 3 : 8))[0];
    });
  }

  // ---- Marathon ----
  function pairUp(ids, rng) {
    const s = ids.slice();
    for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
    const sitOut = s.length % 2 ? s.pop() : null;
    const pairs = [];
    for (let i = 0; i < s.length; i += 2) pairs.push([s[i], s[i + 1]]);
    return { pairs, sitOut };
  }

  const api = { LEVELS, LEVEL_NAMES, ATTACKS, TEAM, damageMult, newBarn, mergeResult, merge, rewardPig, loadBarn,
    megaElements, quickWinChance, computerTeam, pairUp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OinkRules = api;
})(this);
