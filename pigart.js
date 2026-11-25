// Oink: pig pictures. Each pig is ONE 32x32 picture (facing right). The animations are made from it automatically.
// A picture is 1024 colours ('#rrggbb', or '' for see-through), index y*32+x.
// Works in the browser (window.OinkArt, needs elements.js first) and in Node.
(function (root) {
  const E = (typeof module !== 'undefined' && module.exports) ? require('./elements.js') : root.OinkElements;
  const SIZE = 32, CELLS = SIZE * SIZE;
  const ANIMS = ['idle', 'walk', 'attack'];
  const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const OUTLINE = '#2b1d24', EYE = '#1a1a1a';
  const PREFIX = 'window.OINK_PIGS = ';

  const blankFrame = () => Array(CELLS).fill('');
  const blankPig = () => ({ name: '', picture: blankFrame() });
  const isDrawn = pig => !!pig && pig.picture.some(Boolean);

  // ---- colours ----
  const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mixWith = (c, to, t) => hex(rgb(c).map((v, i) => v + (to[i] - v) * t));
  const lighten = (c, t) => mixWith(c, [255, 255, 255], t);
  const darken = (c, t) => mixWith(c, [0, 0, 0], t);
  const dist = (a, b) => { const x = rgb(a), y = rgb(b); return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2; };

  // ---- a plain pig to start from (faces right) ----
  function plainPig(color) {
    const f = blankFrame();
    const snout = lighten(color, 0.4), ear = darken(color, 0.25), leg = darken(color, 0.15);
    const put = (x, y, c) => { if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) f[y * SIZE + x] = c; };
    for (const x of [8, 11, 18, 21]) for (let y = 22; y < 27; y++) { put(x, y, leg); put(x + 1, y, leg); }
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++)
      if (((x - 14) / 10) ** 2 + ((y - 17) / 6.5) ** 2 <= 1 || (x - 23) ** 2 + (y - 14) ** 2 <= 30) put(x, y, color);
    for (let y = 13; y <= 17; y++) { put(28, y, snout); put(29, y, snout); }
    put(29, 14, OUTLINE); put(29, 16, OUTLINE);
    for (let y = 7; y <= 10; y++) for (let x = 20; x <= 20 + (y - 7); x++) put(x, y, ear);
    put(25, 12, EYE); put(25, 13, EYE);
    put(3, 13, ear); put(4, 14, ear); put(3, 15, ear);
    const out = f.slice();
    for (let i = 0; i < CELLS; i++) {
      if (f[i]) continue;
      const x = i % SIZE, y = (i - x) / SIZE;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => {
        const nx = x + a, ny = y + b;
        return nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && f[ny * SIZE + nx] && f[ny * SIZE + nx] !== OUTLINE;
      })) out[i] = OUTLINE;
    }
    return { name: '', picture: out };
  }

  // ---- automatic animations ----
  // move(x, y) says where each pixel goes; pixels moved off the grid are dropped.
  function remap(pic, move) {
    const f = blankFrame();
    for (let i = 0; i < CELLS; i++) {
      if (!pic[i]) continue;
      const x = i % SIZE, y = (i - x) / SIZE;
      const [nx, ny] = move(x, y);
      if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) f[ny * SIZE + nx] = pic[i];
    }
    return f;
  }

  function bounds(pic) {
    let minX = SIZE, maxX = -1, minY = SIZE, maxY = -1;
    for (let i = 0; i < CELLS; i++) if (pic[i]) {
      const x = i % SIZE, y = (i - x) / SIZE;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return { minX, maxX, minY, maxY };
  }
  // The legs are the bottom quarter of the drawing: this is their first row (null for an empty picture).
  function legLine(pic) {
    const { minY, maxY } = bounds(pic);
    return maxY < 0 ? null : minY + Math.ceil((maxY - minY + 1) * 0.75);
  }

  function animate(pic) {
    // Back legs are the left half of the legs, front legs the right half.
    const { minX, maxX } = bounds(pic);
    const legTop = legLine(pic) ?? SIZE;
    const midX = Math.floor((minX + maxX + 1) / 2);
    const walkFrame = (spread, bob) => remap(pic, (x, y) =>
      y >= legTop ? [x + (x < midX ? -spread : spread), y] : [x, y + bob]);
    return {
      idle: [0, 0, 1, 1].map(dy => remap(pic, (x, y) => [x, y + dy])),
      walk: [walkFrame(1, 0), walkFrame(0, -1), walkFrame(-1, 0), walkFrame(0, -1)],
      attack: [0, -1, 3, 1].map(dx => remap(pic, (x, y) => [x + dx, y])),
    };
  }

  // ---- save format: a palette plus one character per pixel ('.' = see-through) ----
  function encodePig(pig) {
    const palette = [], index = new Map();
    for (const c of pig.picture) if (c && !index.has(c) && palette.length < CHARS.length) { index.set(c, palette.length); palette.push(c); }
    const code = c => {
      if (!c) return '.';
      if (!index.has(c)) { // more than 62 colours: use the closest one
        let best = 0; palette.forEach((p, i) => { if (dist(p, c) < dist(palette[best], c)) best = i; });
        index.set(c, best);
      }
      return CHARS[index.get(c)];
    };
    return { name: pig.name || '', palette, picture: pig.picture.map(code).join('') };
  }

  function decodePig(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('not a pig');
    const { palette, picture } = obj;
    if (!Array.isArray(palette) || palette.length > CHARS.length || !palette.every(c => /^#[0-9a-fA-F]{6}$/.test(c)))
      throw new Error('bad colours');
    if (typeof picture !== 'string' || picture.length !== CELLS) throw new Error('bad picture');
    return {
      name: typeof obj.name === 'string' ? obj.name.slice(0, 40) : '',
      picture: Array.from(picture, ch => {
        if (ch === '.') return '';
        const i = CHARS.indexOf(ch);
        if (i < 0 || i >= palette.length) throw new Error('bad pixel');
        return palette[i].toLowerCase();
      }),
    };
  }

  const validKeys = () => new Set([...E.allPigKeys(), E.MEGA]);

  // The file the game loads. Only drawn pigs go in it.
  function exportPigsFile(pigs) {
    const out = {};
    for (const key of [...E.allPigKeys(), E.MEGA]) if (isDrawn(pigs[key])) out[key] = encodePig(pigs[key]);
    return PREFIX + JSON.stringify(out) + ';\n';
  }

  // Reads a pigs.js (or plain .json) file. Throws if anything in it is wrong, so nothing half-loads.
  function parsePigsFile(text) {
    let body = String(text).trim();
    if (body.startsWith(PREFIX)) body = body.slice(PREFIX.length);
    body = body.replace(/;\s*$/, '');
    let obj;
    try { obj = JSON.parse(body); } catch (e) { throw new Error("That isn't a pigs file"); }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error("That isn't a pigs file");
    const keys = validKeys(), pigs = {};
    for (const [key, val] of Object.entries(obj)) {
      if (!keys.has(key)) throw new Error(`Unknown pig: ${key}`);
      try { pigs[key] = decodePig(val); } catch (e) { throw new Error(`The ${E.pigName(key)} pig is broken`); }
    }
    return pigs;
  }

  const api = { SIZE, CELLS, ANIMS, OUTLINE, blankFrame, blankPig, isDrawn, plainPig, animate, legLine,
    encodePig, decodePig, exportPigsFile, parsePigsFile, lighten, darken };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OinkArt = api;
})(this);
