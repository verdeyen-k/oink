// Oink: computer players. input(state, me, level, rng, memory) returns the same kind of input a person makes.
// Works in the browser (window.OinkAI) and in Node.
(function (root) {
  const R = (typeof module !== 'undefined' && module.exports) ? require('./rules.js') : root.OinkRules;
  const LEVEL = {
    veryeasy: { aimErr: 0.6, fire: 0.3, think: 0.7, switchEl: false, dodge: 0, lead: false },
    easy:     { aimErr: 0.35, fire: 0.5, think: 0.5, switchEl: false, dodge: 0.1, lead: false },
    medium:   { aimErr: 0.18, fire: 0.75, think: 0.35, switchEl: true, dodge: 0.3, lead: false },
    hard:     { aimErr: 0.07, fire: 0.95, think: 0.22, switchEl: true, dodge: 0.6, lead: true },
    insane:   { aimErr: 0, fire: 1, think: 0.12, switchEl: true, dodge: 0.95, lead: true },
  };

  function bestElement(p, enemy) {
    let best = p.el, score = -1;
    p.elements.forEach((el, i) => { const m = R.damageMult(el, enemy.elements); if (m > score) { score = m; best = i; } });
    return best;
  }

  function input(state, me, level, rng, mem, dt = 1 / 30) {
    const L = LEVEL[level] || LEVEL.medium;
    const p = state.pigs[me], e = state.pigs[1 - me];
    mem.t = (mem.t || 0) - dt;
    if (mem.t <= 0) { // time to think again
      mem.t = L.think * (0.7 + rng() * 0.6);
      mem.err = (rng() * 2 - 1) * L.aimErr;
      mem.strafe = rng() < 0.5 ? 1 : -1;
      mem.shoot = rng() < L.fire;
      mem.dodging = rng() < L.dodge;
    }
    const A = R.ATTACKS[p.elements[p.el]];
    const dx = e.x - p.x, dy = e.y - p.y, dist = Math.hypot(dx, dy) || 1;
    // keep a good distance for my attack, and move sideways
    const want = Math.min(A.reach * 0.75, 320);
    const toward = dist > want + 40 ? 1 : dist < want - 40 ? -1 : 0;
    let mx = dx / dist * toward + (-dy / dist) * mem.strafe * 0.7;
    let my = dy / dist * toward + (dx / dist) * mem.strafe * 0.7;
    // dodge shots coming at me
    if (mem.dodging) for (const s of state.shots) {
      if (s.owner === me) continue;
      const rx = p.x - s.x, ry = p.y - s.y, sp = Math.hypot(s.vx, s.vy) || 1;
      const ahead = (rx * s.vx + ry * s.vy) / sp;
      if (ahead > 0 && ahead < 220) {
        const side = (rx * s.vy - ry * s.vx) / sp;
        if (Math.abs(side) < p.r + s.r + 10) { const sgn = side >= 0 ? 1 : -1; mx = s.vy / sp * sgn; my = -s.vx / sp * sgn; }
      }
    }
    // aim (good computers aim where you're going)
    let ax = e.x, ay = e.y;
    if (L.lead) { const t = dist / A.speed; ax += e.vx * t; ay += e.vy * t; }
    const ang = Math.atan2(ay - p.y, ax - p.x) + mem.err;
    // switch to the element that hurts most
    let switchEl = false;
    if (L.switchEl && bestElement(p, e) !== p.el) { switchEl = !mem.pressed; }
    mem.pressed = switchEl;
    return { mx, my, aimX: p.x + Math.cos(ang) * dist, aimY: p.y + Math.sin(ang) * dist,
      attack: mem.shoot && dist < A.reach + e.r, switchEl };
  }

  const api = { LEVEL, input, bestElement };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OinkAI = api;
})(this);
