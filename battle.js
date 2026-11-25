// Oink: one fight between two pigs, seen from above. No drawing here: game.js draws the state.
// step(state, dt, inputs) moves everything on. Works in the browser (window.OinkBattle) and in Node.
(function (root) {
  const R = (typeof module !== 'undefined' && module.exports) ? require('./rules.js') : root.OinkRules;
  const W = 960, H = 600, TIME_LIMIT = 90;
  const ROCKS = [
    { x: 480, y: 300, r: 42, kind: 'rock' }, { x: 320, y: 150, r: 30, kind: 'bush' }, { x: 640, y: 450, r: 30, kind: 'bush' },
    { x: 320, y: 470, r: 26, kind: 'rock' }, { x: 640, y: 130, r: 26, kind: 'rock' },
  ];

  function makePig(f, x, face) {
    const hp = f.mega ? 300 : 100;
    return { key: f.key, elements: f.elements.slice(), mega: !!f.mega, x, y: H / 2, hp, maxHp: hp,
      r: f.mega ? 44 : 22, speed: f.mega ? 140 : 180, el: 0, cool: 0, slowT: 0, rootT: 0, pushX: 0, pushY: 0,
      vx: 0, vy: 0, face, attackT: 0, prevSwitch: false, hitT: 0 };
  }

  function createBattle({ a, b }, rng, opts = {}) {
    return {
      w: W, h: H, time: 0, winner: null, shots: [],
      rocks: (opts.rocks || ROCKS).map(r => ({ ...r })),
      pigs: [makePig(a, 150, 1), makePig(b, W - 150, -1)],
    };
  }

  function pushOut(p, state) {
    for (const k of state.rocks) {
      const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 0.001, min = k.r + p.r;
      if (d < min) { p.x = k.x + dx / d * min; p.y = k.y + dy / d * min; }
    }
    p.x = Math.max(p.r, Math.min(W - p.r, p.x));
    p.y = Math.max(p.r, Math.min(H - p.r, p.y));
  }

  function step(state, dt, inputs) {
    if (state.winner !== null) return;
    state.time += dt;
    state.pigs.forEach((p, i) => {
      const inp = inputs[i] || {};
      p.cool = Math.max(0, p.cool - dt); p.slowT = Math.max(0, p.slowT - dt); p.rootT = Math.max(0, p.rootT - dt);
      p.attackT = Math.max(0, p.attackT - dt); p.hitT = Math.max(0, p.hitT - dt);
      // walking
      let mx = inp.mx || 0, my = inp.my || 0;
      const len = Math.hypot(mx, my); if (len > 1) { mx /= len; my /= len; }
      const sp = p.rootT > 0 ? 0 : p.speed * (p.slowT > 0 ? 0.5 : 1);
      const ox = p.x, oy = p.y;
      p.x += (mx * sp + p.pushX) * dt; p.y += (my * sp + p.pushY) * dt;
      const decay = Math.exp(-6 * dt); p.pushX *= decay; p.pushY *= decay;
      pushOut(p, state);
      p.vx = (p.x - ox) / dt; p.vy = (p.y - oy) / dt;
      if (Math.abs(mx) > 0.1) p.face = mx > 0 ? 1 : -1;
      // switching element (once per press)
      if (inp.switchEl && !p.prevSwitch) p.el = (p.el + 1) % p.elements.length;
      p.prevSwitch = !!inp.switchEl;
      // attacking
      if (inp.attack && p.cool <= 0) {
        const el = p.elements[p.el], A = R.ATTACKS[el];
        let dx = (inp.aimX ?? p.x + p.face) - p.x, dy = (inp.aimY ?? p.y) - p.y;
        const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        state.shots.push({ owner: i, el, x: p.x + dx * p.r, y: p.y + dy * p.r, vx: dx * A.speed, vy: dy * A.speed,
          r: A.radius * (p.mega ? 1.5 : 1), left: A.reach, dead: false });
        p.cool = A.every; p.attackT = 0.35;
        if (Math.abs(dx) > 0.2) p.face = dx > 0 ? 1 : -1;
      }
    });

    for (const s of state.shots) {
      const A = R.ATTACKS[s.el], target = state.pigs[1 - s.owner];
      if (A.homing) { // turn a little towards the enemy
        const want = Math.atan2(target.y - s.y, target.x - s.x), have = Math.atan2(s.vy, s.vx);
        let diff = want - have; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
        const turn = Math.max(-A.homing * dt, Math.min(A.homing * dt, diff)), a = have + turn;
        s.vx = Math.cos(a) * A.speed; s.vy = Math.sin(a) * A.speed;
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.left -= A.speed * dt;
      if (s.left <= 0 || s.x < -s.r || s.y < -s.r || s.x > W + s.r || s.y > H + s.r) { s.dead = true; continue; }
      if (state.rocks.some(k => Math.hypot(s.x - k.x, s.y - k.y) < k.r + s.r * 0.5)) { s.dead = true; continue; }
      if (Math.hypot(s.x - target.x, s.y - target.y) < target.r + s.r) {
        s.dead = true;
        const owner = state.pigs[s.owner];
        target.hp -= A.damage * (owner.mega ? 1.5 : 1) * R.damageMult(s.el, target.elements);
        target.hitT = 0.2;
        if (A.slow) target.slowT = A.slow;
        if (A.root) target.rootT = A.root;
        if (A.push) { const d = Math.hypot(s.vx, s.vy) || 1; target.pushX += s.vx / d * A.push; target.pushY += s.vy / d * A.push; }
      }
    }
    state.shots = state.shots.filter(s => !s.dead);

    const [a, b] = state.pigs;
    if (a.hp <= 0 || b.hp <= 0) state.winner = a.hp === b.hp ? 'draw' : a.hp > b.hp ? 0 : 1;
    else if (state.time >= TIME_LIMIT) {
      const sa = a.hp / a.maxHp, sb = b.hp / b.maxHp;
      state.winner = sa === sb ? 'draw' : sa > sb ? 0 : 1;
    }
  }

  const api = { W, H, TIME_LIMIT, ROCKS, createBattle, step };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OinkBattle = api;
})(this);
