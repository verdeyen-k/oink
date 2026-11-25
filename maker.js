// Oink Pig Maker: draw one picture of every pig. The animations are made from it automatically.
(function () {
  const E = window.OinkElements, A = window.OinkArt;
  const S = A.SIZE, STORE = 'oink-pigs-v1', MAX_UNDO = 50;
  const KEYS = [...E.allPigKeys(), E.MEGA];
  const $ = id => document.getElementById(id);

  const PALETTE = [...E.ELEMENTS.map(e => e.color),
    '#000000', A.OUTLINE, '#ffffff', '#808080', '#c8c8c8', '#8b5a2b', '#ff5c8a'];

  // ---- state ----
  let pigs = {};               // key -> {name, picture}; only pigs that have been touched
  let cur = E.allPigKeys()[0];
  let tool = 'pencil', color = PALETTE[0], filter = null;
  const history = {};          // key -> {undo: [], redo: []}
  let anims = null, animsDirty = true;

  // ---- saving ----
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || '{}');
      for (const [k, v] of Object.entries(raw)) if (KEYS.includes(k)) { try { pigs[k] = A.decodePig(v); } catch (e) { /* skip a broken pig */ } }
    } catch (e) { $('saveMsg').textContent = "⚠️ Couldn't read your saved pigs"; }
  }
  function save() {
    try {
      const out = {};
      for (const [k, p] of Object.entries(pigs)) if (A.isDrawn(p) || p.name) out[k] = A.encodePig(p);
      localStorage.setItem(STORE, JSON.stringify(out));
      $('saveMsg').textContent = '';
    } catch (e) { $('saveMsg').textContent = "⚠️ Couldn't save! Export your pigs to keep them."; }
  }

  const pigOf = key => pigs[key] || (pigs[key] = A.blankPig());
  const hist = key => history[key] || (history[key] = { undo: [], redo: [] });
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.style.display = 'block';
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.style.display = 'none'; }, 2500);
  }

  // ---- drawing helpers ----
  function paint(ctx, pic) {
    const img = ctx.createImageData(S, S);
    pic.forEach((c, i) => {
      if (!c) return;
      img.data.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255], i * 4);
    });
    ctx.putImageData(img, 0, 0);
  }

  const grid = $('grid'), gctx = grid.getContext('2d');
  const CELL = grid.width / S;
  function drawGrid() {
    const pic = pigOf(cur).picture;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const c = pic[y * S + x];
      gctx.fillStyle = c || ((x + y) % 2 ? '#e9e2ec' : '#f8f4fa');
      gctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
    gctx.strokeStyle = '#0000001a'; gctx.lineWidth = 1;
    gctx.beginPath();
    for (let i = 1; i < S; i++) { gctx.moveTo(i * CELL + .5, 0); gctx.lineTo(i * CELL + .5, grid.height); gctx.moveTo(0, i * CELL + .5); gctx.lineTo(grid.width, i * CELL + .5); }
    gctx.stroke();
    // the legs line: everything under it is legs in the walk animation
    gctx.strokeStyle = '#ff5c8a55'; gctx.setLineDash([6, 6]);
    gctx.beginPath(); gctx.moveTo(0, grid.height * 0.75); gctx.lineTo(grid.width, grid.height * 0.75); gctx.stroke();
    gctx.setLineDash([]);
  }

  // ---- the pig list ----
  const thumbs = {};
  function buildFilters() {
    const f = $('filters');
    const mk = (label, val, title) => {
      const b = document.createElement('button');
      b.className = 'btn' + (filter === val ? ' on' : ''); b.textContent = label; b.title = title;
      b.onclick = () => { filter = filter === val ? null : val; buildFilters(); buildList(); };
      f.appendChild(b);
    };
    f.innerHTML = '';
    mk('All', null, 'Show all pigs');
    E.ELEMENTS.forEach(e => mk(e.icon, e.id, `Pigs with ${e.name}`));
  }
  function buildList() {
    const list = $('list'); list.innerHTML = '';
    const sections = [['One element', 1], ['Two elements', 2], ['Three elements', 3]];
    for (const [title, n] of sections) {
      const keys = E.allPigKeys().filter(k => E.keyElements(k).length === n && (!filter || E.keyElements(k).includes(filter)));
      if (!keys.length) continue;
      const h = document.createElement('h3'); h.textContent = `${title} (${keys.length})`; list.appendChild(h);
      keys.forEach(k => list.appendChild(listItem(k)));
    }
    if (!filter) {
      const h = document.createElement('h3'); h.textContent = 'The big one'; list.appendChild(h);
      list.appendChild(listItem(E.MEGA));
    }
    updateCounter();
  }
  function listItem(key) {
    const b = document.createElement('button');
    b.className = 'pig' + (key === cur ? ' sel' : ''); b.dataset.key = key;
    const c = document.createElement('canvas'); c.width = c.height = S;
    thumbs[key] = c;
    const icons = document.createElement('span'); icons.className = 'icons';
    const nm = document.createElement('span'); nm.className = 'nm';
    icons.textContent = E.pigLabel(key); icons.appendChild(nm);
    const tick = document.createElement('span'); tick.className = 'tick';
    b.append(c, icons, tick);
    b.onclick = () => select(key);
    refreshItem(key, b);
    return b;
  }
  function refreshItem(key, el = document.querySelector(`.pig[data-key="${key}"]`)) {
    if (!el) return;
    const p = pigs[key];
    const ctx = thumbs[key].getContext('2d'); ctx.clearRect(0, 0, S, S);
    if (p) paint(ctx, p.picture);
    el.querySelector('.nm').textContent = (p && p.name) || E.pigName(key);
    el.querySelector('.tick').textContent = A.isDrawn(p) ? '✅' : '';
  }
  function updateCounter() {
    const n = KEYS.filter(k => A.isDrawn(pigs[k])).length;
    $('counter').textContent = `${n} / ${KEYS.length} drawn`;
  }

  // ---- choosing a pig ----
  function select(key) {
    cur = key;
    document.querySelectorAll('.pig').forEach(el => el.classList.toggle('sel', el.dataset.key === key));
    $('curIcons').textContent = E.pigLabel(key);
    $('curName').textContent = E.pigName(key);
    $('name').value = (pigs[key] && pigs[key].name) || '';
    buildCopyList();
    animsDirty = true;
    drawGrid();
  }
  function buildCopyList() {
    const sel = $('copyFrom'); sel.innerHTML = '';
    const opt = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); };
    const first = E.keyElements(cur)[0];
    opt('plain', cur === E.MEGA ? '🐗 A plain black pig' : `🐷 A plain ${E.BY_ID[first].name} pig`);
    for (const k of KEYS) if (k !== cur && A.isDrawn(pigs[k])) opt(k, `${E.pigLabel(k)} ${(pigs[k].name) || E.pigName(k)}`);
  }

  // ---- changing the picture (with undo) ----
  function remember() {
    const h = hist(cur);
    h.undo.push(pigOf(cur).picture.slice());
    if (h.undo.length > MAX_UNDO) h.undo.shift();
    h.redo = [];
  }
  function changed() {
    animsDirty = true;
    drawGrid(); refreshItem(cur); updateCounter(); save();
  }
  function setPicture(pic) { remember(); pigOf(cur).picture = pic; changed(); buildCopyList(); }
  function undo() {
    const h = hist(cur); if (!h.undo.length) return;
    h.redo.push(pigOf(cur).picture); pigOf(cur).picture = h.undo.pop(); changed();
  }
  function redo() {
    const h = hist(cur); if (!h.redo.length) return;
    h.undo.push(pigOf(cur).picture); pigOf(cur).picture = h.redo.pop(); changed();
  }

  function fill(pic, x, y, to) {
    const from = pic[y * S + x];
    if (from === to) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [px, py] = stack.pop();
      if (px < 0 || py < 0 || px >= S || py >= S || pic[py * S + px] !== from) continue;
      pic[py * S + px] = to;
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  }

  // ---- mouse / finger on the grid ----
  let drawing = false, last = null, strokeChanged = false;
  function cellAt(ev) {
    const r = grid.getBoundingClientRect();
    return [Math.floor((ev.clientX - r.left) / r.width * S), Math.floor((ev.clientY - r.top) / r.height * S)];
  }
  function dab(x, y) {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const pic = pigOf(cur).picture, v = tool === 'eraser' ? '' : color;
    if (pic[y * S + x] !== v) { pic[y * S + x] = v; strokeChanged = true; }
  }
  grid.addEventListener('contextmenu', ev => ev.preventDefault());
  grid.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    const [x, y] = cellAt(ev);
    const right = ev.button === 2; // right click rubs out
    if (tool === 'picker') { const c = pigOf(cur).picture[y * S + x]; if (c) pickColor(c); return; }
    if (tool === 'fill') {
      const pic = pigOf(cur).picture.slice();
      fill(pic, x, y, right ? '' : color);
      if (pic.some((c, i) => c !== pigOf(cur).picture[i])) setPicture(pic);
      return;
    }
    remember(); strokeChanged = false;
    drawing = right ? 'eraser' : true; last = [x, y];
    const was = tool; if (right) tool = 'eraser';
    dab(x, y); tool = was;
    drawGrid(); animsDirty = true;
    grid.setPointerCapture(ev.pointerId);
  });
  grid.addEventListener('pointermove', ev => {
    if (!drawing) return;
    const [x, y] = cellAt(ev);
    const was = tool; if (drawing === 'eraser') tool = 'eraser';
    // draw a line from the last cell so fast strokes have no gaps
    const steps = Math.max(Math.abs(x - last[0]), Math.abs(y - last[1]), 1);
    for (let i = 1; i <= steps; i++) dab(Math.round(last[0] + (x - last[0]) * i / steps), Math.round(last[1] + (y - last[1]) * i / steps));
    tool = was; last = [x, y];
    drawGrid(); animsDirty = true;
  });
  const endStroke = () => {
    if (!drawing) return;
    drawing = false;
    if (!strokeChanged) hist(cur).undo.pop(); // nothing changed: forget the undo step
    else { changed(); buildCopyList(); }
  };
  grid.addEventListener('pointerup', endStroke);
  grid.addEventListener('pointercancel', endStroke);

  // ---- tools, palette, buttons ----
  function setTool(t) {
    tool = t;
    document.querySelectorAll('.tool').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  }
  document.querySelectorAll('.tool').forEach(b => b.onclick = () => setTool(b.dataset.tool));

  function pickColor(c) {
    color = c; $('custom').value = c;
    document.querySelectorAll('.sw').forEach(s => s.classList.toggle('on', s.dataset.c === c));
    if (tool === 'eraser' || tool === 'picker') setTool('pencil');
  }
  function buildPalette() {
    const pal = $('palette');
    PALETTE.forEach(c => {
      const b = document.createElement('button');
      b.className = 'sw'; b.style.background = c; b.dataset.c = c; b.title = c;
      const el = E.ELEMENTS.find(e => e.color === c); if (el) b.title = el.name;
      b.onclick = () => pickColor(c);
      pal.appendChild(b);
    });
    const inp = document.createElement('input'); inp.type = 'color'; inp.id = 'custom'; inp.title = 'Any colour';
    inp.oninput = () => pickColor(inp.value);
    pal.appendChild(inp);
  }

  $('undoBtn').onclick = undo;
  $('redoBtn').onclick = redo;
  $('flipBtn').onclick = () => {
    const p = pigOf(cur).picture, out = A.blankFrame();
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) out[y * S + (S - 1 - x)] = p[y * S + x];
    setPicture(out);
  };
  $('clearBtn').onclick = () => {
    if (!A.isDrawn(pigs[cur])) return;
    if (confirm('Rub out this whole pig? (You can undo it.)')) setPicture(A.blankFrame());
  };
  $('copyBtn').onclick = () => {
    const v = $('copyFrom').value;
    if (A.isDrawn(pigs[cur]) && !confirm('Draw over this pig with the copy? (You can undo it.)')) return;
    let pic;
    if (v === 'plain') pic = A.plainPig(cur === E.MEGA ? '#3a3540' : E.BY_ID[E.keyElements(cur)[0]].color).picture;
    else pic = pigs[v].picture.slice();
    setPicture(pic);
  };
  $('name').oninput = () => { pigOf(cur).name = $('name').value.slice(0, 40); refreshItem(cur); save(); };

  // ---- export / load ----
  $('exportBtn').onclick = () => {
    const n = KEYS.filter(k => A.isDrawn(pigs[k])).length;
    if (!n) { toast('Draw a pig first! 🐷'); return; }
    const blob = new Blob([A.exportPigsFile(pigs)], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'pigs.js';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Saved ${n} pigs to pigs.js 💾`);
  };
  $('loadBtn').onclick = () => $('loadFile').click();
  $('loadFile').onchange = async () => {
    const file = $('loadFile').files[0]; $('loadFile').value = '';
    if (!file) return;
    let loaded;
    try { loaded = A.parsePigsFile(await file.text()); }
    catch (e) { toast(`😬 ${e.message}. Nothing was changed.`); return; }
    const n = Object.keys(loaded).length;
    if (!confirm(`Load ${n} pigs from this file? This replaces the pigs you have now.`)) return;
    pigs = loaded;
    for (const k of Object.keys(history)) delete history[k];
    save(); buildList(); select(cur);
    toast(`Loaded ${n} pigs! 🐷`);
  };

  // ---- keyboard ----
  document.addEventListener('keydown', ev => {
    if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT') return;
    const k = ev.key.toLowerCase();
    if ((ev.ctrlKey || ev.metaKey) && k === 'z') { ev.preventDefault(); ev.shiftKey ? redo() : undo(); }
    else if ((ev.ctrlKey || ev.metaKey) && k === 'y') { ev.preventDefault(); redo(); }
    else if (k === 'b') setTool('pencil');
    else if (k === 'e') setTool('eraser');
    else if (k === 'g') setTool('fill');
    else if (k === 'i') setTool('picker');
  });

  // ---- animation previews ----
  const previews = { idle: $('pIdle'), walk: $('pWalk'), attack: $('pAttack') };
  let frame = 0, lastTick = 0;
  function tick(t) {
    const fps = +$('speed').value;
    if (t - lastTick > 1000 / fps) {
      lastTick = t; frame++;
      if (animsDirty) { anims = A.animate(pigOf(cur).picture); animsDirty = false; }
      for (const a of A.ANIMS) {
        const ctx = previews[a].getContext('2d');
        ctx.clearRect(0, 0, S, S);
        const fr = anims[a]; paint(ctx, fr[frame % fr.length]);
      }
    }
    requestAnimationFrame(tick);
  }

  // ---- start ----
  load();
  buildFilters();
  buildPalette();
  setTool('pencil');
  pickColor(PALETTE[0]);
  buildList();
  select(cur);
  requestAnimationFrame(tick);
})();
