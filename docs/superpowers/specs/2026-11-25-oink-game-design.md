# Oink: the game (design)

The kid drew all 46 pigs in the pig maker (`pigs.js`), so now we build the game. The kid OK'd this design ("go") on 2026-11-25.
The earlier design (`2026-11-24-oink-design.md`) has the elements, merging and the 3 modes in the kid's words.
**(my call)** marks Claude's choices.

## Approaches
- **Build all 3 modes against the computer first, online second (picked).** Online needs a new `oink` key in
  `database.rules.json` that a grown-up has to deploy, so it's a separate step.
- Build one mode at a time: the kid said "build all three", so no.
- Online from the start: blocked on the database rules, and harder to test.

## Files
- `index.html` + `game.js`: the screens (barn, team picking, modes, battle drawing, controls).
- `rules.js`: damage, attacks table, the pig collection (barn), merging, rewards, Marathon pairing. Runs in Node too.
- `battle.js`: the fight itself (movement, attacks, hits, effects, winner), with no drawing. Runs in Node too.
- `ai.js`: computer players at 5 levels.
- Reuses `elements.js`, `pigart.js` (`animate`, `plainPig`) and `pigs.js` (the kid's drawings). A missing drawing falls back to a plain pig.

## The Pig Barn (home)
- Start with 9 pigs, one of each element. Saved in the browser (`localStorage['oink-save-v1']`).
- Merge: pick 2 pigs, and you get the pig with both elements; the 2 old pigs go away. Not allowed if it would make more than 2 elements,
  or **(my call)** if the new pig would be the same as one of the old ones (fire+water with water makes nothing new).
- You can have more than one of the same pig.
- Win a battle and you get a new random one-element pig. Losing doesn't cost pigs. In Classic every round won is a battle won,
  and in Marathon every battle won counts. **(my call: the kid said "every battle you win")**
- Choose a team of 3 different pigs from the barn. **(my call)** Merging is refused if it would leave you with fewer than 3 pigs,
  so you can always make a team.

## Fighting
- Seen from above. Arena 960×600 with grass and 5 rocks/bushes that block walking and attacks.
- Pigs are the kid's drawings (2× size, Mega Boar 4×), flipped when facing left, using the automatic Idle/Walk/Attack animations.
  A coloured ring under each pig shows the side: blue = you, red = computer.
- Health 100 (Mega Boar 300). Speed 180 (Mega Boar 140).
- Controls: WASD to walk, the mouse aims, **left click** attacks with the current element, **right click** switches to the pig's next element.
  Phone **(my call)**: joystick + 💥 attack (aims at the enemy) + 🔄 switch.
- Damage: ×2 for each of the defender's elements that the attack's element beats, ×½ for each that beats it. Common is ×1.
- A round ends when a pig's health hits 0. **(my call)** After 90 seconds the pig with more health left (as a share of its
  starting health) wins. An exact draw is played again.

### Attacks (my call, from the list the kid OK'd)
| | Attack | Speed | Damage | Every (s) | Reach | Extra |
|---|---|---|---|---|---|---|
| 🔥 | fireball | 520 | 10 | 0.45 | 500 | fast |
| ❄️ | ice shard | 420 | 9 | 0.6 | 500 | slows to half speed for 1.5 s |
| 🌿 | vine | 360 | 10 | 0.8 | 220 | holds still for 0.8 s |
| 🪨 | boulder | 260 | 22 | 1.2 | 450 | big |
| 🌪️ | gust | 600 | 7 | 0.4 | 400 | pushes back |
| ⚡ | zap | 900 | 8 | 0.3 | 260 | |
| 🌑 | ghost ball | 300 | 11 | 0.8 | 600 | turns towards the enemy a bit |
| 💧 | wave | 380 | 9 | 0.7 | 320 | wide |
| ⚪ | headbutt | 400 | 14 | 0.6 | 70 | up close |

### Computer levels
Very Easy, Easy, Medium, Hard, Insane: from slow, wobbly aim that never switches element, to leading its shots, dodging and always
switching to its best element. Its team: random pigs. **(my call)** On Hard and Insane it picks pigs that beat yours.

## Modes
- ⚔️ **Classic**: you vs a computer team of 3. Each round you pick one of your pigs that hasn't fought yet. Best of 3 rounds.
- 🏁 **Marathon**: you + 1–7 computer racers (pick 2–8 racers), 5-space court. Each round racers are paired at random; an odd one
  sits out. Your battle is played for real (you pick one of your 3 pigs each battle); the others are decided automatically
  (better matchups and higher levels win more often), and you see the results. Win → 1 space forward, lose → stay.
  First to space 5 wins. **(my call)** If several reach the end in the same round, they all win together.
- 🐗 **Mega Boar**: your 3 pigs become MEGOINK (the kid's Mega Boar drawing) with all their elements (up to 6), Health 300.
  It fights a computer Mega Boar (same drawing, tinted red). One battle.

## Not in this step
Online play (next step, needs the `oink` database key), sounds, more arenas.
