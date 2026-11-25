// Oink: the game. Screens (barn, modes), drawing the fights, and controls.
(function () {
  const E = window.OinkElements, A = window.OinkArt, R = window.OinkRules, B = window.OinkBattle, AI = window.OinkAI;
  const $ = id => document.getElementById(id);
  const ui = $('ui');
  const COLORS = [['Blue', '#4dabf7'], ['Red', '#ff6b6b'], ['Orange', '#ff922b'], ['Yellow', '#ffd43b'], ['Green', '#51cf66'],
    ['Teal', '#20c997'], ['Purple', '#9775fa'], ['Pink', '#f783ac']];
  const WIN_SPACES = 5;

  // ---- the kid's drawings ----
  const DRAWN = {};
  for (const [k, v] of Object.entries(window.OINK_PIGS || {})) { try { DRAWN[k] = A.decodePig(v); } catch (e) { /* skip */ } }
  const pictureOf = key => (DRAWN[key] && DRAWN[key].picture) ||
    A.plainPig(key === E.MEGA ? '#3a3540' : E.BY_ID[E.keyElements(key)[0]].color).picture;
  const nameOf = key => (DRAWN[key] && DRAWN[key].name) || E.pigName(key);

  function frameCanvas(pic, tint) {
    const c = document.createElement('canvas'); c.width = c.height = A.SIZE;
    const ctx = c.getContext('2d'), img = ctx.createImageData(A.SIZE, A.SIZE);
    pic.forEach((col, i) => { if (col) img.data.set([parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16), 255], i * 4); });
    ctx.putImageData(img, 0, 0);
    if (tint) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = tint; ctx.fillRect(0, 0, A.SIZE, A.SIZE); }
    return c;
  }
  const spriteCache = {};
  function sprites(key, tint) {
    const id = key + (tint || '');
    if (!spriteCache[id]) {
      const an = A.animate(pictureOf(key));
      spriteCache[id] = Object.fromEntries(A.ANIMS.map(a => [a, an[a].map(f => frameCanvas(f, tint))]));
    }
    return spriteCache[id];
  }
  function thumb(key, size = 80) {
    const c = frameCanvas(pictureOf(key));
    c.style.width = c.style.height = size + 'px';
    return c;
  }

  // ---- saving ----
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { toast("⚠️ Couldn't save"); } },
  };
  let barn = R.loadBarn(store.get('oink-save-v1', null));
  let team = (() => { try { return JSON.parse(store.get('oink-team-v1', '[]')); } catch (e) { return []; } })();
  let level = R.LEVELS.includes(store.get('oink-level-v1', '')) ? store.get('oink-level-v1') : 'medium';
  let racers = Math.max(2, Math.min(8, +store.get('oink-racers-v1', 4) || 4));
  const fixTeam = () => { team = team.filter((id, i) => barn.pigs.some(p => p.id === id) && team.indexOf(id) === i).slice(0, 3); };
  fixTeam();
  function saveAll() {
    fixTeam();
    store.set('oink-save-v1', JSON.stringify(barn)); store.set('oink-team-v1', JSON.stringify(team));
    store.set('oink-level-v1', level); store.set('oink-racers-v1', String(racers));
  }
  const pigById = id => barn.pigs.find(p => p.id === id);
  const teamKeys = () => team.map(id => pigById(id).key);

  function toast(msg, ms = 2600) {
    const t = $('toast'); t.innerHTML = msg; t.style.display = 'block';
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.style.display = 'none'; }, ms);
  }
  function giveReward() {
    const r = R.rewardPig(barn, Math.random); barn = r.barn; saveAll();
    return `🎁 New pig: ${E.pigLabel(r.key)} <b>${esc(nameOf(r.key))}</b>!`;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'onclick') n.onclick = v; else if (k === 'html') n.innerHTML = v; else if (k === 'disabled') n.disabled = v;
      else n.setAttribute(k, v);
    }
    for (const kid of kids) if (kid != null) n.append(kid);
    return n;
  }
  function pigCard(key, extra = {}) {
    const c = el('div', { class: 'card ' + (extra.cls || '') },
      thumb(key), el('div', { class: 'lab' }, E.pigLabel(key)), el('div', { class: 'nm' }, nameOf(key)));
    if (extra.badge) c.append(el('span', { class: 'badge' }, extra.badge));
    if (extra.onclick) c.onclick = extra.onclick;
    return c;
  }

  // ================= THE BARN =================
  let barnTab = 'team', mergePick = [];
  function showBarn() {
    saveAll();
    ui.innerHTML = '';
    ui.append(el('h1', {}, '🐷 Oink'));

    // level
    const lv = el('div', { class: 'row c' }, el('b', {}, '🤖 Computer: '));
    R.LEVELS.forEach(l => lv.append(el('button', { class: 'btn' + (l === level ? ' on' : ''), onclick: () => { level = l; showBarn(); } }, R.LEVEL_NAMES[l])));
    ui.append(lv);

    // modes
    const ready = team.length === 3;
    const racerRow = el('div', { class: 'row c' }, el('span', {}, 'Racers:'));
    for (let n = 2; n <= 8; n++) racerRow.append(el('button', { class: 'btn' + (n === racers ? ' on' : ''), style: 'padding:4px 9px',
      onclick: () => { racers = n; showBarn(); } }, String(n)));
    ui.append(el('h2', {}, 'Play'), el('div', { class: 'modes' },
      el('div', { class: 'mode' }, el('h3', {}, '⚔️ Classic'), el('p', {}, '3 rounds against a computer team. Best of 3 wins!'),
        el('button', { class: 'btn go', disabled: !ready, onclick: startClassic }, 'Play')),
      el('div', { class: 'mode' }, el('h3', {}, '🏁 Marathon'), el('p', {}, 'Win battles to move up the racing court. First to the end wins!'),
        racerRow, el('br'), el('button', { class: 'btn go', disabled: !ready, onclick: startMarathon }, 'Play')),
      el('div', { class: 'mode' }, el('h3', {}, '🐗 Mega Boar'), el('p', {}, 'Your 3 pigs merge into one giant boar. Boar vs boar!'),
        el('button', { class: 'btn go', disabled: !ready, onclick: startMega }, 'Play'))));
    if (!ready) ui.append(el('p', { class: 'center muted' }, '👇 Pick 3 pigs for your team first!'));

    // team slots
    const slots = el('div', { class: 'slots' });
    for (let i = 0; i < 3; i++) {
      const p = team[i] && pigById(team[i]);
      slots.append(el('div', { class: 'slot', title: p ? 'Tap to take out' : '' }, p ? thumb(p.key, 72) : el('span', { class: 'muted' }, '?')));
      if (p) slots.lastChild.onclick = () => { team.splice(i, 1); showBarn(); };
    }
    ui.append(el('h2', {}, '👥 Your team'), slots);

    // the barn
    ui.append(el('h2', {}, `🏠 Your pig barn (${barn.pigs.length} pigs)`));
    ui.append(el('div', { class: 'row' },
      el('button', { class: 'btn' + (barnTab === 'team' ? ' on' : ''), onclick: () => { barnTab = 'team'; mergePick = []; showBarn(); } }, '👥 Pick team'),
      el('button', { class: 'btn' + (barnTab === 'merge' ? ' on' : ''), onclick: () => { barnTab = 'merge'; mergePick = []; showBarn(); } }, '🔀 Merge pigs')));
    const bar = el('div', { id: 'mergeBar', class: 'row', style: 'margin:10px 0' });
    if (barnTab === 'team') bar.append(el('span', { class: 'muted' }, 'Tap a pig to put it in your team (or take it out).'));
    else {
      if (mergePick.length < 2) bar.append(el('span', { class: 'muted' }, `Tap 2 pigs to merge them. (${mergePick.length}/2 picked)`));
      else {
        const r = R.mergeResult(barn, mergePick[0], mergePick[1]);
        const [a, b] = mergePick.map(id => pigById(id).key);
        if (!r.ok) bar.append(el('span', {}, `${E.pigLabel(a)} + ${E.pigLabel(b)}: 😬 ${r.why}`));
        else bar.append(el('span', { html: `${E.pigLabel(a)} + ${E.pigLabel(b)} = ${E.pigLabel(r.key)} <b>${esc(nameOf(r.key))}</b>&nbsp;` }),
          thumb(r.key, 48),
          el('button', { class: 'btn go', onclick: () => {
            barn = R.merge(barn, mergePick[0], mergePick[1]); mergePick = []; saveAll();
            toast(`🔀 You made ${E.pigLabel(r.key)} <b>${esc(nameOf(r.key))}</b>!`); showBarn();
          } }, '🔀 Merge!'));
      }
    }
    ui.append(bar);
    const cards = el('div', { class: 'cards' });
    const sorted = barn.pigs.slice().sort((x, y) => E.allPigKeys().indexOf(x.key) - E.allPigKeys().indexOf(y.key) || x.id - y.id);
    for (const p of sorted) {
      const inTeam = team.includes(p.id), picked = mergePick.includes(p.id);
      cards.append(pigCard(p.key, {
        cls: barnTab === 'merge' ? (picked ? 'pick' : '') : (inTeam ? 'team' : ''),
        badge: inTeam ? '👥' : '',
        onclick: () => {
          if (barnTab === 'team') {
            if (inTeam) team = team.filter(id => id !== p.id);
            else if (team.length < 3) team.push(p.id);
            else toast('Your team is full! Tap a pig in the team to take it out.');
          } else {
            if (picked) mergePick = mergePick.filter(id => id !== p.id);
            else mergePick = [...mergePick, p.id].slice(-2);
          }
          showBarn();
        },
      }));
    }
    ui.append(cards);
    ui.append(el('p', { class: 'center muted', style: 'margin-top:20px' },
      'WASD to walk · mouse to aim · left click to attack · right click to switch element'));
  }

  // ================= CLASSIC =================
  let classic = null;
  function startClassic() {
    const keys = teamKeys();
    classic = { mine: keys.slice(), used: [], theirs: R.computerTeam(level, keys, Math.random), round: 0, score: [0, 0], log: [] };
    classicPick();
  }
  function classicPick() {
    const c = classic;
    ui.innerHTML = '';
    const theirKey = c.theirs[c.round];
    ui.append(el('h1', {}, '⚔️ Classic'),
      el('p', { class: 'center', style: 'font-size:24px' }, `Round ${c.round + 1} · You ${c.score[0]} - ${c.score[1]} Computer`));
    if (c.log.length) ui.append(el('p', { class: 'center', html: c.log[c.log.length - 1] }));
    ui.append(el('div', { class: 'box center' }, el('b', {}, 'The computer sends out:'), el('div', { class: 'row c' }, pigCard(theirKey))));
    ui.append(el('h2', { class: 'center' }, 'Pick your pig for this round'));
    const cards = el('div', { class: 'row c' });
    c.mine.forEach((k, i) => {
      const used = c.used.includes(i);
      cards.append(pigCard(k, { cls: used ? 'used' : '', onclick: used ? null : () => {
        fight({ key: k, elements: E.keyElements(k) }, { key: theirKey, elements: E.keyElements(theirKey) }, res => {
          if (res === 'draw') { c.log.push('🤝 A draw! Play the round again.'); return classicPick(); }
          c.used.push(i);
          c.score[res]++;
          c.log.push(res === 0 ? `🎉 You won round ${c.round + 1}! ${giveReward()}` : `😢 You lost round ${c.round + 1}.`);
          c.round++;
          if (c.score[0] >= 2 || c.score[1] >= 2 || c.round >= 3) classicEnd(); else classicPick();
        });
      } }));
    });
    ui.append(cards, el('div', { class: 'row c', style: 'margin-top:16px' }, el('button', { class: 'btn', onclick: showBarn }, '🏠 Back to the barn')));
  }
  function classicEnd() {
    const c = classic, won = c.score[0] > c.score[1];
    ui.innerHTML = '';
    ui.append(el('h1', {}, won ? '🏆 You win!' : '😢 You lose'),
      el('p', { class: 'center', style: 'font-size:24px' }, `You ${c.score[0]} - ${c.score[1]} Computer`),
      el('div', { class: 'box' }, el('ul', { class: 'res', html: c.log.map(l => `<li>${l}</li>`).join('') })),
      el('div', { class: 'row c', style: 'margin-top:16px' },
        el('button', { class: 'btn go', onclick: startClassic }, '🔁 Play again'), el('button', { class: 'btn', onclick: showBarn }, '🏠 Barn')));
  }

  // ================= MARATHON =================
  let mara = null;
  function startMarathon() {
    const keys = teamKeys();
    mara = { round: 0, log: [], racers: COLORS.slice(0, racers).map(([name, color], i) => ({
      id: i, name: i === 0 ? 'You' : name, color, pos: 0, team: i === 0 ? keys : R.computerTeam(level, keys, Math.random) })) };
    maraRound();
  }
  function court() {
    const box = el('div', { class: 'box court' });
    for (const r of mara.racers) {
      const lane = el('div', { class: 'lane' }, el('span', { class: 'who', html: `<span class="dot" style="background:${r.color}"></span>${esc(r.name)}` }));
      for (let s = 0; s <= WIN_SPACES; s++) lane.append(el('div', { class: 'sp' + (s === WIN_SPACES ? ' end' : '') }, s === r.pos ? '🐷' : s === WIN_SPACES ? '🏁' : ''));
      box.append(lane);
    }
    return box;
  }
  function maraRound() {
    const m = mara;
    const { pairs, sitOut } = R.pairUp(m.racers.map(r => r.id), Math.random);
    m.round++;
    const mine = pairs.find(p => p.includes(0));
    ui.innerHTML = '';
    ui.append(el('h1', {}, '🏁 Marathon'), el('p', { class: 'center', style: 'font-size:22px' }, `Round ${m.round}`), court());
    if (m.log.length) ui.append(el('div', { class: 'box', style: 'margin-top:10px' }, el('b', {}, 'Last round:'),
      el('ul', { class: 'res', html: m.log.map(l => `<li>${l}</li>`).join('') })));
    const rest = pairs.filter(p => p !== mine);
    const finish = myResult => {
      const log = [];
      if (mine) {
        const other = m.racers[mine[0] === 0 ? mine[1] : mine[0]];
        if (myResult === 0) { m.racers[0].pos++; log.push(`🎉 You beat ${esc(other.name)}! ${giveReward()}`); }
        else if (myResult === 1) { other.pos++; log.push(`😢 ${esc(other.name)} beat you.`); }
        else log.push(`🤝 You and ${esc(other.name)} drew. Nobody moves.`);
      } else log.push('😴 You sat out this round.');
      for (const [a, b] of rest) {
        const ra = m.racers[a], rb = m.racers[b];
        const ka = ra.team[Math.floor(Math.random() * 3)], kb = rb.team[Math.floor(Math.random() * 3)];
        const w = Math.random() < R.quickWinChance(ka, kb) ? ra : rb, l = w === ra ? rb : ra;
        w.pos++;
        log.push(`${esc(w.name)} ${E.pigLabel(w === ra ? ka : kb)} beat ${esc(l.name)} ${E.pigLabel(w === ra ? kb : ka)}`);
      }
      if (sitOut !== null && sitOut !== 0) log.push(`😴 ${esc(m.racers[sitOut].name)} sat out.`);
      m.log = log;
      const winners = m.racers.filter(r => r.pos >= WIN_SPACES);
      if (winners.length) maraEnd(winners); else maraRound();
    };
    if (mine) {
      const other = m.racers[mine[0] === 0 ? mine[1] : mine[0]];
      const theirKey = other.team[Math.floor(Math.random() * 3)];
      ui.append(el('div', { class: 'box center', style: 'margin-top:10px' },
        el('b', { html: `You're racing <span class="dot" style="background:${other.color}"></span>${esc(other.name)}, who sends out:` }),
        el('div', { class: 'row c' }, pigCard(theirKey))));
      ui.append(el('h2', { class: 'center' }, 'Pick your pig'));
      const cards = el('div', { class: 'row c' });
      m.racers[0].team.forEach(k => cards.append(pigCard(k, { onclick: () =>
        fight({ key: k, elements: E.keyElements(k) }, { key: theirKey, elements: E.keyElements(theirKey) }, finish) })));
      ui.append(cards);
    } else {
      ui.append(el('p', { class: 'center', style: 'font-size:20px' }, '😴 You sit out this round.'),
        el('div', { class: 'row c' }, el('button', { class: 'btn go', onclick: () => finish(null) }, 'Next round ▶')));
    }
    ui.append(el('div', { class: 'row c', style: 'margin-top:16px' }, el('button', { class: 'btn', onclick: showBarn }, '🏠 Give up')));
  }
  function maraEnd(winners) {
    const youWon = winners.some(r => r.id === 0);
    ui.innerHTML = '';
    ui.append(el('h1', {}, youWon ? (winners.length > 1 ? '🏆 You tied for first!' : '🏆 You win the race!') : '😢 You lose the race'),
      el('p', { class: 'center', html: 'Finished: ' + winners.map(r => `<span class="dot" style="background:${r.color}"></span>${esc(r.name)}`).join(', ') }),
      court(),
      el('div', { class: 'box', style: 'margin-top:10px' }, el('ul', { class: 'res', html: mara.log.map(l => `<li>${l}</li>`).join('') })),
      el('div', { class: 'row c', style: 'margin-top:16px' },
        el('button', { class: 'btn go', onclick: startMarathon }, '🔁 Race again'), el('button', { class: 'btn', onclick: showBarn }, '🏠 Barn')));
  }

  // ================= MEGA BOAR =================
  function startMega() {
    const keys = teamKeys(), theirs = R.computerTeam(level, keys, Math.random);
    const mine = R.megaElements(keys), their = R.megaElements(theirs);
    ui.innerHTML = '';
    const side = (who, ks, els, tint) => el('div', { class: 'mode' }, el('h3', {}, who),
      el('div', { class: 'row c' }, ...ks.map(k => thumb(k, 48))), el('div', { style: 'font-size:30px' }, '⬇️'),
      (() => { const c = frameCanvas(pictureOf(E.MEGA), tint); c.style.cssText = 'width:128px;height:128px;image-rendering:pixelated'; return c; })(),
      el('div', { style: 'font-size:26px' }, els.map(e => E.BY_ID[e].icon).join('')));
    ui.append(el('h1', {}, '🐗 Mega Boar'), el('p', { class: 'center' }, `${nameOf(E.MEGA)} vs ${nameOf(E.MEGA)}!`),
      el('div', { class: 'modes' }, side('You', keys, mine), side('Computer', theirs, their, '#ff000055')),
      el('div', { class: 'row c', style: 'margin-top:16px' },
        el('button', { class: 'btn go', onclick: () => fight({ key: E.MEGA, elements: mine, mega: true }, { key: E.MEGA, elements: their, mega: true }, res => {
          if (res === 'draw') { toast('🤝 A draw! Go again!'); return startMega(); }
          ui.innerHTML = '';
          ui.append(el('h1', {}, res === 0 ? '🏆 Your boar wins!' : '😢 Your boar lost'),
            res === 0 ? el('p', { class: 'center', style: 'font-size:22px', html: giveReward() }) : null,
            el('div', { class: 'row c' }, el('button', { class: 'btn go', onclick: startMega }, '🔁 Again'), el('button', { class: 'btn', onclick: showBarn }, '🏠 Barn')));
        }) }, '⚔️ Fight!'),
        el('button', { class: 'btn', onclick: showBarn }, '🏠 Back')));
  }

  // ================= THE FIGHT =================
  const arena = $('arena'), ctx = arena.getContext('2d');
  const keys = {}, mouse = { x: 0, y: 0, left: false, right: false };
  const touch = { on: false, mx: 0, my: 0, attack: false, switchEl: false };
  let battle = null, onDone = null, aiMem = {}, countdown = 0, endT = 0, lastT = 0, acc = 0;

  function fit() {
    const s = Math.min(innerWidth / B.W, innerHeight / B.H);
    arena.style.width = B.W * s + 'px'; arena.style.height = B.H * s + 'px';
  }
  addEventListener('resize', fit);

  function fight(me, them, done) {
    battle = B.createBattle({ a: me, b: them }, Math.random);
    battle.tints = [null, them.mega ? '#ff000055' : null];
    onDone = done; aiMem = {}; countdown = 3; endT = 0; acc = 0; lastT = performance.now();
    $('battle').style.display = 'block'; $('battleMsg').style.display = 'none'; $('battleMsg').innerHTML = ''; ui.style.display = 'none';
    fit();
    requestAnimationFrame(frame);
  }
  function leaveFight(result) {
    battle = null;
    $('battle').style.display = 'none'; ui.style.display = '';
    const d = onDone; onDone = null;
    if (result === 'quit') showBarn(); else if (d) d(result);
  }
  $('quit').onclick = () => { if (confirm('Quit this game?')) leaveFight('quit'); };

  function playerInput() {
    let mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    let my = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    const me = battle.pigs[0], them = battle.pigs[1];
    if (touch.on) {
      if (touch.mx || touch.my) { mx = touch.mx; my = touch.my; }
      return { mx, my, aimX: them.x, aimY: them.y, attack: touch.attack || mouse.left, switchEl: touch.switchEl || keys.q };
    }
    return { mx, my, aimX: mouse.x, aimY: mouse.y, attack: mouse.left || keys[' '], switchEl: mouse.right || keys.q };
  }

  function frame(t) {
    if (!battle) return;
    const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
    if (countdown > 0) countdown -= dt;
    else if (battle.winner === null) {
      acc += dt;
      while (acc >= 1 / 60 && battle.winner === null) {
        B.step(battle, 1 / 60, [playerInput(), AI.input(battle, 1, level, Math.random, aiMem, 1 / 60)]);
        acc -= 1 / 60;
      }
    } else if (!endT) {
      endT = t;
      const w = battle.winner, msg = $('battleMsg');
      msg.innerHTML = `<h2>${w === 0 ? '🎉 You win!' : w === 1 ? '😢 You lose' : '🤝 Draw!'}</h2>`;
      const res = w;
      msg.append(el('button', { class: 'btn go', onclick: () => leaveFight(res) }, 'Continue ▶'));
      msg.style.display = 'block';
    }
    draw(t / 1000);
    requestAnimationFrame(frame);
  }

  // ---- drawing the arena ----
  function draw(now) {
    const s = battle;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#7cc45a'; ctx.fillRect(0, 0, B.W, B.H);
    ctx.fillStyle = '#6fb850';
    for (let y = 0; y < B.H; y += 40) for (let x = (y / 40 % 2) * 40; x < B.W; x += 80) ctx.fillRect(x, y, 40, 40);
    for (const k of s.rocks) {
      ctx.fillStyle = '#0003'; ctx.beginPath(); ctx.ellipse(k.x + 6, k.y + 8, k.r, k.r * 0.8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = k.kind === 'bush' ? '#2f8a3a' : '#8e8a86';
      ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, 7); ctx.fill();
      ctx.fillStyle = k.kind === 'bush' ? '#46a84f' : '#aaa6a1';
      ctx.beginPath(); ctx.arc(k.x - k.r * 0.3, k.y - k.r * 0.3, k.r * 0.5, 0, 7); ctx.fill();
    }
    // pigs, lower ones in front
    [0, 1].sort((a, b) => s.pigs[a].y - s.pigs[b].y).forEach(i => drawPig(s.pigs[i], i, now));
    for (const sh of s.shots) {
      const col = E.BY_ID[sh.el].color;
      ctx.globalAlpha = sh.el === 'common' ? 0.5 : 0.95;
      ctx.fillStyle = col; ctx.strokeStyle = '#0006'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
      if (sh.r >= 10) { ctx.font = `${Math.round(sh.r * 1.2)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(E.BY_ID[sh.el].icon, sh.x, sh.y + 1); }
    }
    hud(s);
    if (countdown > 0) bigText(String(Math.ceil(countdown)));
    else if (countdown > -0.6 && s.time < 0.6) bigText('GO!');
  }
  function drawPig(p, i, now) {
    const size = A.SIZE * (p.mega ? 4 : 2.2);
    ctx.fillStyle = '#0003'; ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.7, p.r * 1.1, p.r * 0.45, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = i === 0 ? COLORS[0][1] : COLORS[1][1]; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.7, p.r * 1.2, p.r * 0.5, 0, 0, 7); ctx.stroke();
    const sp = sprites(p.key, battle.tints[i]);
    const moving = Math.hypot(p.vx, p.vy) > 5;
    const anim = p.attackT > 0 ? 'attack' : moving ? 'walk' : 'idle';
    const frames = sp[anim];
    const f = anim === 'attack' ? frames[Math.min(frames.length - 1, Math.floor((1 - p.attackT / 0.35) * frames.length))]
      : frames[Math.floor(now * (moving ? 10 : 4)) % frames.length];
    ctx.save();
    ctx.translate(p.x, p.y - size * 0.15);
    if (p.face < 0) ctx.scale(-1, 1);
    if (p.hitT > 0 && Math.floor(now * 30) % 2) ctx.globalAlpha = 0.4;
    ctx.drawImage(f, -size / 2, -size / 2, size, size);
    ctx.restore();
    if (p.slowT > 0) emoji('❄️', p.x + p.r, p.y - p.r - 10, 18);
    if (p.rootT > 0) emoji('🌿', p.x - p.r, p.y - p.r - 10, 18);
  }
  function emoji(t, x, y, sz) { ctx.font = `${sz}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y); }
  function bigText(t) {
    ctx.font = '700 96px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 10; ctx.strokeStyle = '#2a1730'; ctx.strokeText(t, B.W / 2, B.H / 2); ctx.fillStyle = '#fff'; ctx.fillText(t, B.W / 2, B.H / 2);
  }
  function hud(s) {
    s.pigs.forEach((p, i) => {
      const w = 300, x = i === 0 ? 16 : B.W - 16 - w, y = 14;
      ctx.fillStyle = '#0008'; roundRect(x - 6, y - 6, w + 12, 66, 12);
      ctx.fillStyle = '#ffffff33'; ctx.fillRect(x, y, w, 18);
      const frac = Math.max(0, p.hp / p.maxHp);
      ctx.fillStyle = frac > 0.5 ? '#51cf66' : frac > 0.25 ? '#ffd43b' : '#ff6b6b'; ctx.fillRect(x, y, w * frac, 18);
      ctx.font = '600 15px Fredoka, sans-serif'; ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
      ctx.textAlign = i === 0 ? 'left' : 'right';
      ctx.fillText(`${i === 0 ? 'You' : 'Computer'}: ${nameOf(p.key)}  ❤️ ${Math.max(0, Math.ceil(p.hp))}`, i === 0 ? x + 4 : x + w - 4, y + 9);
      p.elements.forEach((e, j) => {
        const ex = i === 0 ? x + 14 + j * 34 : x + w - 14 - (p.elements.length - 1 - j) * 34;
        if (j === p.el) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, y + 40, 15, 0, 7); ctx.fill(); }
        emoji(E.BY_ID[e].icon, ex, y + 41, j === p.el ? 22 : 16);
      });
    });
    ctx.font = '700 26px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText(String(Math.max(0, Math.ceil(B.TIME_LIMIT - s.time))), B.W / 2, 30);
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.fill(); }

  // ---- controls ----
  addEventListener('keydown', e => { if (!battle) return; keys[e.key.toLowerCase()] = true; if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault(); });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.left = mouse.right = false; });
  function toWorld(e) { const r = arena.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width * B.W; mouse.y = (e.clientY - r.top) / r.height * B.H; }
  arena.addEventListener('contextmenu', e => e.preventDefault());
  arena.addEventListener('mousemove', toWorld);
  arena.addEventListener('mousedown', e => { toWorld(e); if (e.button === 0) mouse.left = true; if (e.button === 2) mouse.right = true; });
  addEventListener('mouseup', e => { if (e.button === 0) mouse.left = false; if (e.button === 2) mouse.right = false; });

  // phone: joystick + buttons, shown after the first touch
  function showTouch() { if (touch.on) return; touch.on = true; document.querySelectorAll('.touch').forEach(t => { t.style.display = t.id === 'stick' ? 'block' : 'grid'; }); }
  addEventListener('touchstart', showTouch, { passive: true });
  const stick = $('stick'), knob = $('knob');
  let stickId = null;
  function moveStick(t) {
    const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = t.clientX - cx, dy = t.clientY - cy; const d = Math.hypot(dx, dy), max = r.width / 2 - 20;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touch.mx = dx / max; touch.my = dy / max;
  }
  stick.addEventListener('touchstart', e => { e.preventDefault(); stickId = e.changedTouches[0].identifier; moveStick(e.changedTouches[0]); });
  stick.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === stickId) moveStick(t); });
  const stickEnd = e => { for (const t of e.changedTouches) if (t.identifier === stickId) { stickId = null; touch.mx = touch.my = 0; knob.style.transform = ''; } };
  stick.addEventListener('touchend', stickEnd); stick.addEventListener('touchcancel', stickEnd);
  for (const [id, prop] of [['tAttack', 'attack'], ['tSwitch', 'switchEl']]) {
    const b = $(id);
    b.addEventListener('touchstart', e => { e.preventDefault(); touch[prop] = true; });
    b.addEventListener('touchend', e => { e.preventDefault(); touch[prop] = false; });
    b.addEventListener('touchcancel', () => { touch[prop] = false; });
  }

  window.OinkGame = { battle: () => battle }; // for testing
  showBarn();
})();
