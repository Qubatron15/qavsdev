/*
 * Presentation wrapper: drives the game with the SPACE key alone, one scripted beat per press,
 * so the talk can show every attack without juggling two players' keymaps.
 *
 * It's built on top of the game, never inside it: nothing under src/ is edited.
 *  - Input: SPACE is caught before the game sees it; each beat is played by dispatching ordinary
 *    keyboard events on `window`, exactly as if the keys had been pressed (the game's own handler
 *    in src/js/input.js does the rest).
 *  - State: the core hands every attack module its context (`ctx.match`, `ctx.updateHud`) each
 *    simulation step. We wrap the environment attack's update(dt, ctx) to read that context, so
 *    the script can wait for "the fight started", "the swarm is gone" etc. instead of guessing.
 *
 * Loaded before src/main.js by vite.presentation.config.js (npm run dev:presentation).
 * If the keymap in src/js/fight.js (LAYOUT) changes, update KEYS below.
 */
import { SPECIALS, environment } from '../src/attacks/index.js';

// ── Keys (event.code), mirrors LAYOUT / ENV_KEY / BOSS_KEY in src/js/fight.js ────────────────
const KEYS = {
  throw: ['Digit1', 'Digit6'], // floppy, per player
  docs: 'Digit2',
  hotfix: 'Digit3',
  codegen: 'Digit4',
  undocumented: 'Digit5',
  bugs: 'Digit7',
  acs: 'Digit8',
  priority: 'Digit9',
  guardBugs: 'KeyX', // Kuba's counter to the bug swarm
  environment: 'KeyG',
  boss: 'KeyT',
  start: 'Space',
  reset: 'Backspace',
};

// ── Tuning ──────────────────────────────────────────────────────────────────────────────────
const BOSS_ATTACK_INTERVAL = 1000; // ms between attacks on the boss (players take turns)
const MIN_HEALTH = 5; // % — the scripted fight never ends in an accidental K.O.
const WAIT_TIMEOUT = 15000; // ms — a beat gives up waiting rather than hang the wrapper
const BOSS_MOVE_GRACE = 1200; // ms a boss turn waits for its planned move before throwing a floppy
/**
 * Attacks each player cycles through against the boss. Specials (one at a time per fighter,
 * ~3 s each) alternate with quick moves so each turn usually gets the move it planned.
 */
const BOSS_ROTATION = [
  ['hotfix', 'docs', 'codegen', 'throw', 'undocumented', 'docs'],
  ['acs', 'bugs', 'priority', 'throw'],
];

// ── Game context, captured from the environment attack's per-step update ────────────────────
let ctx = null;
const pinnedTime = new WeakMap(); // match → its round time, frozen during the versus script

const originalEnvUpdate = environment.update;
environment.update = function (dt, gameCtx) {
  ctx = gameCtx;
  const { match } = gameCtx;
  if (!match.boss && match.phase === 'fight') {
    // The talk sets the pace, not the round clock.
    if (!pinnedTime.has(match)) pinnedTime.set(match, match.timeLeft);
    match.timeLeft = pinnedTime.get(match);
  }
  const result = originalEnvUpdate.call(this, dt, gameCtx);
  if (!match.boss && match.phase === 'fight') keepAlive(match);
  return result;
};

/** Runs after this step's hits, before the core checks for a K.O.: nobody drops to zero. */
function keepAlive(match) {
  let touched = false;
  for (const f of match.fighters) {
    if (f.health < MIN_HEALTH) {
      f.health = MIN_HEALTH;
      touched = true;
    }
  }
  if (touched) {
    match.pendingKo = false;
    ctx.updateHud();
  }
}

const match = () => ctx?.match ?? null;
const phase = () => match()?.phase ?? 'ready';

// ── Synthetic input ─────────────────────────────────────────────────────────────────────────
const synthetic = new WeakSet();

function send(type, code) {
  const key = code.startsWith('Digit') ? code.slice(5) : code.startsWith('Key') ? code[3] : code;
  const event = new KeyboardEvent(type, { code, key: key.toLowerCase(), bubbles: true });
  synthetic.add(event);
  dispatchEvent(event);
}
const keyDown = (code) => send('keydown', code);
const keyUp = (code) => send('keyup', code);

async function tap(code) {
  keyDown(code);
  await sleep(80);
  keyUp(code);
}

// ── Waiting, cancelled by a reset ───────────────────────────────────────────────────────────
class Cancelled extends Error {}
let generation = 0;

function sleep(ms) {
  const gen = generation;
  return new Promise((resolve, reject) =>
    setTimeout(() => (gen === generation ? resolve() : reject(new Cancelled())), ms),
  );
}

/** Resolve once `condition()` holds (checked every frame); false on timeout. */
function waitUntil(condition, timeout = WAIT_TIMEOUT) {
  const gen = generation;
  const start = performance.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (gen !== generation) return reject(new Cancelled());
      if (condition()) return resolve(true);
      if (performance.now() - start > timeout) return resolve(false);
      requestAnimationFrame(check);
    };
    check();
  });
}

// ── Attack readiness, read from the live match ──────────────────────────────────────────────
const fighterOf = (player) => match().fighters[player];
const specialRunning = (player) => match().specials.some((s) => SPECIALS[s.kind].owner === player);
const volleyOf = (id) => match().volleys?.[id]?.volley ?? null;

function canUse(player, id) {
  const m = match();
  if (!m || m.phase !== 'fight') return false;
  const f = fighterOf(player);
  if (f.stun > 0) return false;
  if (id === 'throw') return f.cooldown === 0 && !m.floppies.some((p) => p.owner === player);
  if (f.swarmCooldown > 0 || specialRunning(player)) return false;
  return SPECIALS[id] ? true : !volleyOf(id);
}

/** The attack has played out: no special or swarm of that kind left on the stage. */
function finished(id) {
  const m = match();
  if (!m) return true;
  if (SPECIALS[id]) return !m.specials.some((s) => s.kind === id);
  return !volleyOf(id);
}

const keyFor = (player, id) => (id === 'throw' ? KEYS.throw[player] : KEYS[id]);

/** Wait until `player` can use attack `id`, use it, and wait for it to play out. */
async function attack(player, id) {
  await waitUntil(() => canUse(player, id));
  await tap(keyFor(player, id));
  await waitUntil(() => finished(id));
}

// ── Getting the arena into the right mode ───────────────────────────────────────────────────
const inVersusFight = () => phase() === 'fight' && !match().boss;

async function ensureVersusFight() {
  if (inVersusFight()) return;
  const versusIntro = phase() === 'intro' && !match().boss; // already starting: just wait
  if (!versusIntro && (match()?.boss || phase() !== 'ready')) {
    await tap(KEYS.reset);
    await waitUntil(() => phase() === 'ready');
  }
  if (!versusIntro) await tap(KEYS.start);
  await waitUntil(inVersusFight);
}

async function startBossFight() {
  await tap(KEYS.reset);
  await waitUntil(() => phase() === 'ready');
  await tap(KEYS.boss);
  await waitUntil(() => phase() === 'fight' && !!match().boss);
}

// ── The script: one beat per SPACE ──────────────────────────────────────────────────────────
const DEV = 0;
const QA = 1;

const BEATS = [
  {
    title: 'QA: bug swarm → DEV blocks',
    async run() {
      await ensureVersusFight();
      await waitUntil(() => canUse(QA, 'bugs'));
      await tap(KEYS.bugs);
      // Kuba's counter only arms while the swarm is incoming: press it once it's on its way.
      await waitUntil(() => !!volleyOf('bugs'));
      await sleep(150);
      keyDown(KEYS.guardBugs);
      try {
        await waitUntil(() => finished('bugs'));
        await sleep(200);
      } finally {
        keyUp(KEYS.guardBugs);
      }
    },
  },
  { title: 'DEV: no documentation means no bugs', run: () => attack(DEV, 'docs') },
  { title: 'DEV: friday afternoon hotfix', run: () => attack(DEV, 'hotfix') },
  { title: 'DEV: AI code-gen', run: () => attack(DEV, 'codegen') },
  { title: 'DEV: undocumented changes', run: () => attack(DEV, 'undocumented') },
  { title: 'QA: missing ACs', run: () => attack(QA, 'acs') },
  {
    title: 'Flaky environments',
    async run() {
      await waitUntil(() => {
        const m = match();
        return m?.phase === 'fight' && !m.environment && m.envCooldown === 0;
      });
      await tap(KEYS.environment);
      await waitUntil(() => !match()?.environment);
    },
  },
  { title: 'QA: bug priority wars', run: () => attack(QA, 'priority') },
  {
    title: 'Co-op: BUG BOSS',
    async run() {
      await startBossFight();
      const next = [0, 0]; // position in each player's rotation
      for (let turn = 0; phase() === 'fight' && match().boss.health > 0; turn++) {
        const player = turn % 2 ? QA : DEV;
        const rotation = BOSS_ROTATION[player];
        const id = rotation[next[player]++ % rotation.length];
        // Hit-freezes slow the game clock, so give the planned move a moment to come off
        // cooldown; if it still can't go, throw a floppy instead.
        const ready = await waitUntil(() => canUse(player, id), BOSS_MOVE_GRACE);
        if (ready) tap(keyFor(player, id));
        else if (canUse(player, 'throw')) tap(keyFor(player, 'throw'));
        await sleep(BOSS_ATTACK_INTERVAL);
      }
    },
  },
];

let beatIndex = 0; // next beat to play
let busy = false;
let queued = false; // one SPACE pressed while a beat was still playing

async function playNext() {
  if (busy) {
    queued = true;
    return;
  }
  busy = true;
  try {
    do {
      queued = false;
      if (beatIndex >= BEATS.length) beatIndex = 0; // after the boss: start the show over
      if (beatIndex === 0 && !inVersusFight()) {
        // Starting the match is a press of its own: the first attack waits for the next SPACE.
        indicator.textContent = '▶ START';
        await ensureVersusFight();
        continue;
      }
      const beat = BEATS[beatIndex++];
      showStep(beatIndex, beat.title);
      await beat.run();
    } while (queued);
  } catch (error) {
    if (!(error instanceof Cancelled)) console.error(error);
  } finally {
    busy = false;
    queued = false;
    showStep(beatIndex);
  }
}

/** BACKSPACE (the game's own reset) also rewinds the script. */
function rewind() {
  generation++;
  beatIndex = 0;
  busy = false;
  queued = false;
  showStep(0);
}

// ── Small step indicator in the corner ──────────────────────────────────────────────────────
const indicator = document.createElement('div');
Object.assign(indicator.style, {
  position: 'fixed',
  right: '10px',
  bottom: '8px',
  zIndex: 9999,
  font: '10px "Press Start 2P", monospace',
  color: '#fff',
  opacity: '0.55',
  pointerEvents: 'none',
  textShadow: '0 0 4px #000',
});

function showStep(index, title) {
  const total = BEATS.length;
  if (title) indicator.textContent = `▶ ${index}/${total} ${title}`;
  else if (index >= total) indicator.textContent = `■ ${total}/${total} · SPACE: from the top`;
  else if (index === 0 && !inVersusFight()) indicator.textContent = 'SPACE ▸ START';
  else indicator.textContent = `SPACE ▸ ${index + 1}/${total} ${BEATS[index].title}`;
}
showStep(0);
document.body.appendChild(indicator); // module scripts run after the document is parsed

// ── Input: capture phase on window runs before the game's own listener ─────────────────────
addEventListener(
  'keydown',
  (event) => {
    if (synthetic.has(event)) return;
    if (event.code === KEYS.start) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) playNext();
    } else if (event.code === KEYS.reset && !event.repeat) {
      rewind(); // and let the game reset the arena
    }
  },
  { capture: true },
);
addEventListener(
  'keyup',
  (event) => {
    if (!synthetic.has(event) && event.code === KEYS.start) event.stopImmediatePropagation();
  },
  { capture: true },
);
