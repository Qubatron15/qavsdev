# DEV vs QA · FIGHT!

Interactive talk slide for **TestCon 2027**: a retro fighting game in which a full-stack developer and a senior QA engineer trade blows over "works on my machine", Friday hotfixes and AI-generated ticket floods. Each key press plays one animated story beat while the speaker talks.

Vanilla JavaScript (ES modules) with [Vite](https://vite.dev/). No frameworks. All sound is synthesised with the Web Audio API.

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev        # dev server with hot reload
npm run build      # production build → dist/
npm run preview    # serve dist/ locally
```

`dist/` uses relative paths, so any static file server or host can serve it.

## Controls

### Fight (two players, one keyboard, no numpad)

Each player has a movement cluster and two rows that line up column by column: the **number row** holds your attacks, the **bottom row** your blocks. **Same column = same slot:** your block in slot N counters your opponent's attack in slot N.

| Slot | Kuba attack         | Kuba block      | Emilia attack       | Emilia block        |
| ---- | ------------------- | --------------- | ------------------- | ------------------- |
| 1    | `1` floppy          | hold `Z`        | `6` floppy          | hold `N`            |
| 2    | `2` no docs         | `X` vs bugs     | `7` bug swarm       | `M` vs no docs      |
| 3    | `3` Friday hotfix   | `C` vs ACs      | `8` missing ACs     | `,` vs hotfix       |
| 4    | `4` AI code-gen     | `V` vs priority | `9` priority wars   | `.` vs code-gen     |
| 5    | `5` undocumented    | —               | —                   | `/` vs undocumented |
| Move | `A` / `D`, `W` jump |                 | `J` / `L`, `I` jump |                     |

`G` triggers the **environment attack** ("flaky environments"). It belongs to neither player.

`T` starts the **co-op boss fight** instead of a match: a giant bug (`src/assets/sprites/bug_boss.png`) crawls into the middle of the arena and both players attack it with their usual keys. Every attack that would hit the opponent hits the boss instead, and each hit takes a little of its 500 HP (shown as a bar under the HUD). The players can't hurt each other, can't walk past the boss, and `G` is off. Squash it within 90 s to win; otherwise it ships to prod. Tuning and the boss element live in `src/js/fight/boss.js`.

`Space` starts a match (and a rematch after the match ends). Best of three rounds, 60 s each. The keymap panel is shown before a match and after it ends; the caption bar keeps a short version during the fight. Both are generated from `LAYOUT` in `src/js/fight.js`, so changing keys there updates the UI too.

- **Floppy throw:** 8–12 damage, +2 per combo hit (hits within 1.6 s, max +6), 12% chance of a ×1.5 critical. One floppy in flight per player.
- **Hold block (slot 1):** only on the ground; takes 20% chip damage, no hit stun, breaks the attacker's combo. You can't move or throw while blocking. It only stops floppies.
- **Swarms (slot 2):** five bugs / crossed-out documents fly at the opponent and deal one standard hit. The matching counter (`X` for Kuba, `M` for Emilia) pops the whole swarm — no damage, block pose, and a quip.
- **Specials (slots 3–5):** wind-up + speech bubble, then a scene effect and unblockable hit(s) — unless the defender counters with the matching key. Specials share the swarm cooldown.
- **Counters (slots 2–5):** press while that exact attack is incoming and keep holding until it lands; they work even in hit stun but root you in place. Pressing a counter when that attack isn't coming shows `MISS` and locks your counters for 0.6 s, so mashing every block key doesn't work.
- **Flaky environments (`G`):** the arena and HUD quake, the floor cracks and turns to lava, and three burn ticks (2–4 HP each, about 9 HP in total) hit **both** fighters. Neither the hold block nor a counter stops it, but a fighter who is airborne during a tick takes no damage from it (`SAFE!`). It can be triggered only during a round, one at a time, with an 8 s cooldown after it ends. It can K.O. (including a double K.O.).
- **Jump** over a floppy to dodge it. Two floppies that meet mid-air cancel out.
- A round ends on K.O. or when the timer runs out (more health wins). Taking a round at full health is a PERFECT.

### Talk

| Key         | Action                                                   |
| ----------- | -------------------------------------------------------- |
| `1` – `8`   | Play a story beat                                        |
| `C`         | Flip to / from the editable case-study slide             |
| `Backspace` | Reset the arena (also cancels a beat that is mid-flight) |
| `=`         | Mute / unmute (or click the sound label)                 |
| `Esc`       | Leave an edited text box on the case-study slide         |

The DevOps boss (`0`) is currently commented out; search for `DevOps boss: disabled` to restore it.

Audio starts on the first key press because browsers block sound until the user interacts with the page.

## Project layout

```
index.html              markup: arena, HUD, boss scene, case-study slide
src/
  main.js               entry point: styles, sprites, input, initial reset
  assets/
    sprites/            fighter poses, split by character
      emi/              emi_ stand, throw, block, hit, jump
      kuba/             kuba_ stand, throw, block, hit, jump
    props/              scene props (guitar, masks, radar console)
  attacks/              one folder per attack: index.js (logic + counter data), style.css, its assets
    index.js            attack registry (id → attack)
    floppy-attack/      floppy disk (both players) + classic hold block
    docs-attack/        Kuba: "no docs, no bugs" swarm
    hotfix-attack/      Kuba: friday afternoon hotfix
    codegen-attack/     Kuba: AI code-gen
    undocumented-attack/ Kuba: undocumented changes
    bugs-attack/        Emilia: bug swarm
    acs-attack/         Emilia: missing ACs
    priority-attack/    Emilia: bug priority wars
    environment-attack/ G: flaky environments (lava, burns both)
  styles/               base, scene, hud, effects, flashy, boss, case-study
  js/
    state.js            shared state (health, mute, case-study flag, generation)
    dom.js              $ helper and shared element refs
    timing.js           sleep() / wait(): a reset cancels running beats
    stage.js            scales the fixed 960×540 stage to the window
    audio.js            Web Audio synth and the sfx.* sound effects
    sprites.js          fighter pose loader (setPose / flashPose) + HUD portraits
    fight.js            two-player fight core: keymap, physics, counters, damage, rounds, main loop
    fight/              constants and helpers shared with src/attacks, volley.js (swarm engine)
    effects.js          projectiles, floating text, banners, sparks, shake, lunge, hurt
    flashy.js           fighting-game flash: hit sparks, super flash + cut-in, dimming, camera, afterimages, trails
    hud.js              health bars, damage, caption
    caseStudy.js        arena ↔ case-study flip
    reset.js            resetArena()
    input.js            keyboard and click handling
    beats/              one file per story beat + index.js (key → beat map)
```

## Editing the talk

- **Story beats:** each beat in `src/js/beats/` is an async function. Use `await wait(ms)` between steps rather than `setTimeout`, so that pressing `Backspace` cancels it cleanly. To add one, create a file there and register its key in `beats/index.js`.
- **Case-study slide:** edit the placeholder text in `index.html` (`#case`), or click the boxes and type during the talk. Live edits aren't saved.
- **Attacks:** to add one, create `src/attacks/<name>-attack/` (copy a similar attack), register it in `src/attacks/index.js` and bind its key (and its counter's key) in `LAYOUT` in `src/js/fight.js`.
- **Coordinates** are in stage pixels (960×540), whatever the window size.

## Scripts

| Script                 | Description                     |
| ---------------------- | ------------------------------- |
| `npm run lint`         | ESLint                          |
| `npm run format`       | Format everything with Prettier |
| `npm run format:check` | Check formatting (e.g. in CI)   |
