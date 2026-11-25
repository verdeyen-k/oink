// Oink: pig pictures. A frame is 32x32 = 1024 colours ('#rrggbb', or '' for see-through), index y*32+x.
// The built-in default pig, the automatic mixes for undrawn pigs, and the save format.
// Works in the browser (window.OinkArt, needs elements.js first) and in Node.
(function (root) {
  const E = (typeof module !== 'undefined' && module.exports) ? require('./elements.js') : root.OinkElements;
  const SIZE = 32, CELLS = SIZE * SIZE;
  const ANIMS = ['idle', 'walk', 'attack'];
  const START_FRAMES = 4, MIN_FRAMES = 1, MAX_FRAMES = 8;
  const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const OUTLINE = '#2b1d24', EYE = '#1a1a1a';

  const blankFrame = () => Array(CELLS).fill('');
  const blankPig = () => ({ name: '', anims: Object.fromEntries(ANIMS.map(a => [a, Array.from({ length: START_FRAMES }, blankFrame)])) });
  const clonePig = p => ({ name: p.name || '', anims: Object.fromEntries(ANIMS.map(a => [a, p.anims[a].map(f => f.slice())])) });

  // ---- colours ----
  const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mixWith = (c, to, t) => hex(rgb(c).map((v, i) => v + (to[i] - v) * t));
  const lighten = (c, t) => mixWith(c, [255, 255, 255], t);
  const darken = (c, t) => mixWith(c, [0, 0, 0], t);
  const luminance = c => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const dist = (a, b) => { const x = rgb(a), y = rgb(b); return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2; };

  // ---- the default pig (faces right) ----
  function drawPig(color, { dy = 0, dx = 0, legs = 0, mouth = false } = {}) {
    const f = blankFrame();
    const body = color, snout = lighten(color, 0.4), ear = darken(color, 0.25), leg = darken(color, 0.15);
    const put = (x, y, c) => { x += dx; y += dy; if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) f[y * SIZE + x] = c; };
    // legs: back pair and front pair lift on alternate walk frames
    const legTop = 22;
    [[8, 1], [11, 2], [18, 1], [21, 2]].forEach(([x, pair]) => {
      const lift = legs && legs === pair ? 1 : 0;
      for (let y = legTop; y < 27 - lift; y++) for (let i = 0; i < 2; i++) put(x + i, y, leg);
    });
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const inBody = ((x - 14) / 10) ** 2 + ((y - 17) / 6.5) ** 2 <= 1;
      const inHead = (x - 23) ** 2 + (y - 14) ** 2 <= 30;
      if (inBody || inHead) put(x, y, body);
    }
    for (let y = 13; y <= 17; y++) for (let x = 28; x <= 29; x++) put(x, y, snout);   // snout
    put(29, 14, OUTLINE); put(29, 16, OUTLINE);                                       // nostrils
    if (mouth) { put(27, 18, OUTLINE); put(28, 18, OUTLINE); }
    for (let y = 7; y <= 10; y++) for (let x = 20; x <= 20 + (y - 7); x++) put(x, y, ear); // ear
    put(25, 12, EYE); put(25, 13, EYE);                                                  // eye
    put(3, 13, ear); put(4, 14, ear); put(3, 15, ear);                                   // curly tail
    // dark outline round everything
    const out = f.slice();
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      if (f[y * SIZE + x]) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => {
        const nx = x + a, ny = y + b;
        return nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && f[ny * SIZE + nx] && f[ny * SIZE + nx] !== OUTLINE;
      });
      if (near) out[y * SIZE + x] = OUTLINE;
    }
    return out;
  }

  function defaultPig(color) {
    return {
      name: '',
      anims: {
        idle: [0, 1, 1, 0].map(dy => drawPig(color, { dy })),
        walk: [1, 0, 2, 0].map((legs, i) => drawPig(color, { legs, dy: i % 2 ? 0 : -1 })),
        attack: [0, 2, 3, 0].map((dx, i) => drawPig(color, { dx, mouth: i === 1 || i === 2 })),
      },
    };
  }

  // The most-used colour that isn't see-through or very dark (outlines and eyes don't count).
  function mainColor(pig) {
    const count = new Map();
    for (const a of ANIMS) for (const f of pig.anims[a]) for (const c of f)
      if (c && luminance(c) >= 0.2) count.set(c, (count.get(c) || 0) + 1);
    let best = null, n = 0;
    for (const [c, k] of count) if (k > n) { best = c; n = k; }
    return best;
  }

  // What a pig looks like right now: the kid's drawing if there is one, otherwise an automatic one.
  function resolvePig(key, pigs) {
    if (pigs[key]) return { pig: pigs[key], auto: false };
    if (key === E.MEGA) return { pig: blankPig(), auto: true };
    const ids = E.keyElements(key);
    if (ids.length === 1) return { pig: defaultPig(E.BY_ID[ids[0]].color), auto: true };
    return { pig: autoMix(key, pigs), auto: true };
  }

  // A mixed pig starts as its first element's pig with the body in stripes, one stripe per element.
  function autoMix(key, pigs) {
    const ids = E.keyElements(key);
    const singles = ids.map(id => resolvePig(id, pigs).pig);
    const colors = ids.map((id, i) => mainColor(singles[i]) || E.BY_ID[id].color);
    const base = clonePig(singles[0]);
    base.name = '';
    const match = colors[0], n = ids.length;
    for (const a of ANIMS) base.anims[a] = base.anims[a].map(f => {
      let minX = SIZE, maxX = -1;
      for (let i = 0; i < CELLS; i++) if (f[i]) { const x = i % SIZE; minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
      const width = maxX - minX + 1;
      return f.map((c, i) => c === match ? colors[Math.min(n - 1, Math.floor((i % SIZE - minX) * n / width))] : c);
    });
    return base;
  }

  // ---- save format: a palette plus one character per pixel ('.' = see-through) ----
  function encodePig(pig) {
    const palette = [];
    const index = new Map();
    for (const a of ANIMS) for (const f of pig.anims[a]) for (const c of f) {
      if (c && !index.has(c) && palette.length < CHARS.length) { index.set(c, palette.length); palette.push(c); }
    }
    const code = c => {
      if (!c) return '.';
      if (!index.has(c)) { // more than 62 colours: use the closest one
        let best = 0; palette.forEach((p, i) => { if (dist(p, c) < dist(palette[best], c)) best = i; });
        index.set(c, best);
      }
      return CHARS[index.get(c)];
    };
    return { name: pig.name || '', palette, anims: Object.fromEntries(ANIMS.map(a => [a, pig.anims[a].map(f => f.map(code).join(''))])) };
  }

  function decodePig(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('not a pig');
    const palette = obj.palette;
    if (!Array.isArray(palette) || palette.length > CHARS.length || !palette.every(c => /^#[0-9a-fA-F]{6}$/.test(c)))
      throw new Error('bad colours');
    if (!obj.anims || typeof obj.anims !== 'object') throw new Error('no animations');
    const anims = {};
    for (const a of ANIMS) {
      const frames = obj.anims[a];
      if (!Array.isArray(frames) || frames.length < MIN_FRAMES || frames.length > MAX_FRAMES) throw new Error(`bad ${a} animation`);
      anims[a] = frames.map(s => {
        if (typeof s !== 'string' || s.length !== CELLS) throw new Error(`bad ${a} frame`);
        return Array.from(s, ch => {
          if (ch === '.') return '';
          const i = CHARS.indexOf(ch);
          if (i < 0 || i >= palette.length) throw new Error(`bad ${a} pixel`);
          return palette[i].toLowerCase();
        });
      });
    }
    return { name: typeof obj.name === 'string' ? obj.name.slice(0, 40) : '', anims };
  }

  const api = { SIZE, CELLS, ANIMS, START_FRAMES, MIN_FRAMES, MAX_FRAMES, OUTLINE, blankFrame, blankPig, clonePig, defaultPig,
    mainColor, resolvePig, autoMix, encodePig, decodePig, lighten, darken };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OinkArt = api;
})(this);
