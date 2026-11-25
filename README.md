# 🐷 Oink

A game kind of like Pokémon, but you **merge pigs**! Open **`index.html`** to play against the computer.

## The elements

There are 9 elements. The first 8 go in a circle, and each one beats **the next one**:

🔥 Fire → ❄️ Ice → 🌿 Plant → 🪨 Rock → 🌪️ Air → ⚡ Electric → 🌑 Dark → 💧 Water → 🔥 Fire

⚪ **Common** beats nothing, and nothing beats it.

## Pigs and merging

- A pig has 1 or 2 elements. There's one pig for every mix: **45 pigs**!
- Merge two pigs to make one pig with both pigs' elements: 🔥 + 💧 = 🔥💧. The two old pigs are used up.
- 🔥💧 + 💧 = 🔥💧 works too, because the water only counts once.
- No pig can have more than 2 elements, so 🔥💧 + 🌿 can't merge.
- You start with 9 pigs, one of each element. Win a battle to get a new one-element pig.

## 🏠 The Pig Barn

- **👥 Pick team**: tap 3 pigs for your team.
- **🔀 Merge pigs**: tap 2 pigs, then press Merge! You always keep at least 3 pigs.
- Pick how good the computer is: Very Easy, Easy, Medium, Hard or Insane.

## ⚔️ Fighting

You play as your pig, seen from above, in a grassy arena with rocks and bushes to hide behind.
**WASD** (or arrows) to walk, the **mouse** to aim, **left click** to attack, **right click** (or Q) to switch element.
On a phone: joystick, 💥 to attack (it aims for you), 🔄 to switch.

Every pig has ❤️ 100. If your element beats theirs it does **double damage**, and if theirs beats yours it does **half**.
After 90 seconds, the pig with more health left wins. Every battle you win gets you a 🎁 new one-element pig!

| | Attack | |
|---|---|---|
| 🔥 | Fireball | fast |
| ❄️ | Ice shard | slows them down |
| 🌿 | Vine | short, holds them still |
| 🪨 | Boulder | slow, big damage |
| 🌪️ | Gust | pushes them back |
| ⚡ | Zap | super fast, short |
| 🌑 | Ghost ball | follows them a bit |
| 💧 | Wave | wide splash |
| ⚪ | Headbutt | up close |

## 🎮 3 game modes

- ⚔️ **Classic**: you vs a computer team of 3. Each round you see their pig and pick one of yours. Best of 3 wins!
- 🏁 **Marathon**: 2 to 8 racers on a 5-space racing court. Each round racers pair up and fight. Win and you move 1 space.
  First to the 🏁 wins! (If two finish in the same round, they tie.)
- 🐗 **Mega Boar**: your 3 pigs merge into MEGOINK with all their elements and ❤️ 300. Boar vs boar!

Online play is coming next.

## 🎨 The pig maker

Open **`maker.html`** on the computer (it's not linked from the game, because on the website it only changes pigs in your own browser).

- Pick a pig from the list on the left (46: all 45 pigs plus the 🐗 Mega Boar). Use the element buttons to only show pigs with that element.
- Draw **one picture** of the pig, facing **right**. The bottom quarter of your drawing is the **legs** (below the pink dashed line).
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
- `rules.js`: damage, attacks, the pig barn and merging, computer teams, Marathon pairing.
- `battle.js`: one fight (no drawing), stepped by `step(state, dt, inputs)`. `ai.js`: computer players.
- `index.html` / `game.js`: the game screens and drawing. Saves in `localStorage` (`oink-save-v1`, `oink-team-v1`, ...).
- `pigs.js`: the kid's pig drawings, exported from the maker.
- Tests: `npm test` (Node 20, `node --test`).
- Design: `docs/superpowers/specs/` (the idea + the maker, and the game).
