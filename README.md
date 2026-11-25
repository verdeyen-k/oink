# 🐷 Oink

A game kind of like Pokémon, but you **merge pigs**! (Still being made. The **pig maker** is ready.)

## The elements

There are 9 elements. The first 8 go in a circle, and each one beats **the next one**:

🔥 Fire → ❄️ Ice → 🌿 Plant → 🪨 Rock → 🌪️ Air → ⚡ Electric → 🌑 Dark → 💧 Water → 🔥 Fire

⚪ **Common** beats nothing, and nothing beats it.

## Pigs and merging

- A pig has 1, 2 or 3 elements. There's one pig for every mix: **129 pigs**!
- Merge two pigs to make one pig with both pigs' elements: 🔥 + 💧 = 🔥💧. The two old pigs are used up.
- Pigs that share an element can merge too: 🔥💧 + 🔥🌿 = 🔥💧🌿.
- No pig can have more than 3 elements.
- You start with 9 pigs, one of each element. Win a battle to get a new one-element pig.

## Fighting (coming soon)

You play as your pig, seen from above. **WASD** to walk, **left click** to attack, **right click** to switch element.
Play the computer (Very Easy to Insane) or friends online.

- ⚔️ **Classic Fight**: a team of 3 pigs, 3 rounds, one pig each round. Best of 3 wins!
- 🏁 **Marathon**: 2 to 8 racers on a 5-space racing court. Win a battle to move 1 space. First to the end wins!
- 🐗 **Mega Boar**: your 3 pigs merge into one giant black boar with all their elements and 1 attack per element.
  Boar vs boar!

## 🎨 The pig maker

Open **`maker.html`**.

- Pick a pig from the list on the left (130: all 129 pigs plus the 🐗 Mega Boar). Use the element buttons to only show pigs with that element.
- Draw **one picture** of the pig, facing **right**. Everything below the pink dashed line is the **legs**.
- The maker makes the 😐 **Idle**, 🚶 **Walk** and 💥 **Attack** animations by itself. Watch them on the right!
- Tools: ✏️ pencil (B), 🧽 eraser (E, or right click), 🪣 fill (G), 💉 pick a colour (I), ↩️ undo (Ctrl+Z), ↪️ redo (Ctrl+Y), ↔️ flip, 🗑️ clear.
- **Start from** lets you copy another pig's picture, or a plain pig, then change it.
- Give a pig a name if you want.
- It saves by itself in your browser. Press **💾 Export pigs.js** to save a file. That's the file the game will use,
  and it's your backup. **📂 Load file** brings a `pigs.js` back.

## For grown-ups / developers

Plain HTML + JavaScript, no build step.

- `elements.js`: elements, who beats who, pig keys (`fire+water`, always in circle order) and merging.
- `pigart.js`: the plain pig, the automatic animations (`animate(picture)`), and the save format for `pigs.js`.
- `maker.html` / `maker.js`: the pig maker. Pigs are saved in `localStorage['oink-pigs-v1']`.
- Tests: `npm test` (Node 20, `node --test`).
- Design: `docs/superpowers/specs/2026-11-24-oink-design.md`.
