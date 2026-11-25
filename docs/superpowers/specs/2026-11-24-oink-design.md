# Oink: design (the game idea + the pig maker)

Oink is the kid's new game: a bit like Pokémon, but you **merge pigs**. Everything about the game below is the
kid's idea, from the interview on 2026-11-24. Things marked **(my call)** are Claude's suggestions. The kid
can change them.

We build it the same way as Dogscraper and Pastry Pathway: **the pig maker comes first** (this document's
build), and **the game comes after**. The game loads the `pigs.js` file the maker exports.

## The game (what the maker is for)

### Elements
- 9 elements: 🔥 Fire, ❄️ Ice, 🌿 Plant, 🪨 Rock, 🌪️ Air, ⚡ Electric, 🌑 Dark, 💧 Water, ⚪ Common.
- The first 8 go in a circle, and each one beats **only the next one**:
  Fire → Ice → Plant → Rock → Air → Electric → Dark → Water → Fire.
- ⚪ Common beats nothing, and nothing beats it.

### Pigs and merging
- A pig has 1, 2 or 3 elements. There's exactly one pig for every mix: 9 + 36 + 84 = **129 pigs**.
- Merging two pigs makes one pig with both pigs' elements (🔥 + 💧 = 🔥💧). The two old pigs are used up.
- You can't merge if the new pig would have more than 3 elements.
- Pigs that share an element **can** merge: 🔥💧 + 🔥🌿 = 🔥💧🌿 (the shared element only counts once).
- Order doesn't matter: 🔥💧 and 💧🔥 are the same pig.
- You start with 9 pigs, one of each element. Each battle you win gets you a new random one-element pig.
- Your pigs are saved on your device.

### Fighting
- Real time, seen from above. You play as the pig: WASD to walk, **left click** attacks with your current element,
  **right click** switches to your pig's next element. (Phone controls: joystick + buttons. **(my call)**)
- Opponents: the computer (Very Easy, Easy, Medium, Hard, Insane) or online friends with a room code.
  You can't play 2 people on one device.

### 3 game modes
1. **Classic Fight**: team of 3 pigs, 3 rounds, one pig per round, best of 3.
2. **Marathon**: 2–8 racers on a 5-space racing court. Each round racers are paired up and fight. The winner moves
   1 space and the loser stays put. First to the end wins. You bring a team of 3 and pick one for each battle.
3. **Mega Boar**: your 3 pigs merge into one huge black boar with all their elements (3–9 types), with 1 attack
   per element. It fights another Mega Boar (computer or online **(my call)**).

The game itself (fighting, AI, online, modes) is **not** part of this build. It gets its own design later.

## Approaches considered (for the maker)

- **A. Draw every pig from scratch.** 129 pigs × 3 animations × ~4 frames ≈ 1,500 pictures. Too much blank-grid work.
- **B. A head start for mixed pigs (picked by the kid).** The kid draws the 9 one-element pigs, and each mixed pig
  starts as an automatic mix the kid can change or redraw.

## The pig maker (this build)

Files: `oink/maker.html`, `oink/maker.js`, `oink/elements.js` (the element table and who beats who, shared with
the future game). It's plain HTML + JS with no build step, Fredoka font and a chunky, colourful style like the other games.

### Layout
- **Left: pig list.** 130 entries: 9 one-element pigs, 36 two-element pigs, 84 three-element pigs and the 🐗 Mega Boar,
  in sections, each shown by its element icons and a little thumbnail. A ✅ marks pigs the kid has drawn, an "auto" badge marks
  pigs still using the automatic mix, and a counter at the top shows "12 / 130 drawn". You can filter the list by element.
- **Middle: drawing grid.** 32×32 pixel art. Tools: pencil, eraser, fill bucket, colour picker (eyedropper),
  undo/redo, clear, mirror-flip. Palette: 16 starter colours that include each element's colour, plus a custom
  colour chooser. Transparent background shown as a checkerboard.
- **Animation bar.** 3 tabs: 😐 Idle, 🚶 Walk, 💥 Attack. Each starts with 4 frames, and you can add, copy, delete or reorder
  frames (1–8 per animation). "Onion skin" shows the previous frame faintly. A preview box plays the animation, with a speed slider.
- **Pig name box** (optional) for giving each pig a name. **(my call)**

### The head start (approach B)
- A pig's elements are always kept in circle order (Fire, Ice, Plant, Rock, Air, Electric, Dark, Water, Common), and its key is
  the element ids joined with `+`, e.g. `fire+water`.
- An undrawn mixed pig shows an **automatic mix**: its first element's frames, with the body recoloured in stripes
  (left half / right half for 2 elements, thirds for 3), using each element pig's main colour. The "main colour" is the most-used colour that
  isn't black/outline.
- The automatic mix updates if the kid changes the one-element pigs. As soon as the kid draws on a mixed pig, it becomes
  their own drawing ("auto" badge goes away). A **"Start again from the mix"** button brings the automatic mix back.
- **"Copy from…"** lets any pig start from any other pig's drawing.
- The Mega Boar starts blank (in the game it's drawn big and black; the kid draws it).

### Saving
- Saves by itself to the browser (localStorage) after every change.
- **Export `pigs.js`**: downloads a file the game will load (`window.OINK_PIGS = {...}`). Frames are stored compactly
  (palette + one string per frame). Only hand-drawn pigs are stored; the game makes the automatic mixes itself with the same code.
- **Load file**: loads a `pigs.js` back in (for moving to another computer or restoring a backup).
- Sprites are drawn facing right. The game flips them when a pig walks left. **(my call)**
- The attack animation is just the pig. The game draws the fire/water/etc. blast. **(my call)**

### Not in this build
- The fighting game, merging screen, modes, AI, online play.
- No GitHub repo or website yet. Making the repo or putting it on verdeyengames.com needs a grown-up's OK first.

## Left to the builder
- Exact colours and icons per element (reuse Tower Trample's icons and colours, and pick a soft grey/pink for Common).
- How big the grid is drawn on screen, keyboard shortcuts, and the exact look of buttons.
