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

### Fight (two players, one keyboard)

| Action | Kuba (left side) | Emilia (right side)          |
| ------ | ---------------- | ---------------------------- |
| Move   | `A` / `D`        | `←` / `→`                    |
| Jump   | `W`              | `↑`                          |
| Block  | hold `S`         | hold `↓`                     |
| Throw  | `F` (or `G`)     | `Enter` (or `L`, numpad `0`) |

`Space` starts a match (and a rematch after the match ends). Best of three rounds, 60 s each.

- **Floppy throw:** 8–12 damage, +2 per combo hit (hits within 1.6 s, max +6), 12% chance of a ×1.5 critical. One floppy in flight per player.
- **Block:** only on the ground; takes 20% chip damage, no hit stun, breaks the attacker's combo. You can't move or throw while blocking.
- **Jump** over a floppy to dodge it. Two floppies that meet mid-air cancel out.
- A round ends on K.O. or when the timer runs out (more health wins). Taking a round at full health is a PERFECT.

### Talk

| Key       | Action                                                   |
| --------- | -------------------------------------------------------- |
| `1` – `8` | Play a story beat                                        |
| `C`       | Flip to / from the editable case-study slide             |
| `R`       | Reset the arena (also cancels a beat that is mid-flight) |
| `M`       | Mute / unmute (or click the sound label)                 |
| `Esc`     | Leave an edited text box on the case-study slide         |

The DevOps boss (`0`) is currently commented out; search for `DevOps boss: disabled` to restore it.

Audio starts on the first key press because browsers block sound until the user interacts with the page.

## Project layout

```
index.html              markup: arena, HUD, boss scene, case-study slide
src/
  main.js               entry point: styles, sprites, input, initial reset
  assets/
    sprites/            fighter poses: kuba_/emi_ stand, throw, block, hit
    props/              scene props (guitar, floppy, masks, radar console)
  styles/               base, scene, hud, effects, boss, case-study
  js/
    state.js            shared state (health, mute, case-study flag, generation)
    dom.js              $ helper and shared element refs
    timing.js           sleep() / wait(): a reset cancels running beats
    stage.js            scales the fixed 960×540 stage to the window
    audio.js            Web Audio synth and the sfx.* sound effects
    sprites.js          fighter pose loader (setPose / flashPose) + HUD portraits
    fight.js            two-player fight: input, physics, floppies, damage, rounds
    effects.js          projectiles, floating text, banners, sparks, shake, lunge, hurt
    hud.js              health bars, damage, caption
    caseStudy.js        arena ↔ case-study flip
    reset.js            resetArena()
    input.js            keyboard and click handling
    beats/              one file per story beat + index.js (key → beat map)
```

## Editing the talk

- **Story beats:** each beat in `src/js/beats/` is an async function. Use `await wait(ms)` between steps rather than `setTimeout`, so that pressing `R` cancels it cleanly. To add one, create a file there and register its key in `beats/index.js`.
- **Case-study slide:** edit the placeholder text in `index.html` (`#case`), or click the boxes and type during the talk. Live edits aren't saved.
- **Coordinates** are in stage pixels (960×540), whatever the window size.

## Scripts

| Script                 | Description                     |
| ---------------------- | ------------------------------- |
| `npm run lint`         | ESLint                          |
| `npm run format`       | Format everything with Prettier |
| `npm run format:check` | Check formatting (e.g. in CI)   |
