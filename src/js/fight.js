import floppySrc from '../assets/props/floppy.png';
import { $, fighter } from './dom.js';
import { state } from './state.js';
import { sfx } from './audio.js';
import { banner, popText, shake, sparks } from './effects.js';
import { setCaption, setHealth } from './hud.js';
import { FIGHTER_HEIGHT, setPose } from './sprites.js';

/*
 * Two-player fight: a fixed-timestep simulation driven by requestAnimationFrame.
 * Everything time-based (cooldowns, stun, round phases) lives in this module's
 * state and is advanced by update(dt), so a reset just replaces the state —
 * no stray timers survive it.
 */

// ── Tuning ──────────────────────────────────────────────────────────────────
const ROUNDS_TO_WIN = 2; // best of three
const ROUND_TIME = 60; // seconds
const MAX_HEALTH = 100;
const DANGER_HEALTH = 25;

const ARENA_MIN_X = 70; // fighter centre limits (stage px)
const ARENA_MAX_X = 890;
const MIN_GAP = 120; // fighters can't walk through each other
const GROUND = 76; // fighters' feet, px above the stage bottom
const WALK_SPEED = 230; // px/s
const JUMP_VELOCITY = 980; // px/s → peak ≈ 200px
const GRAVITY = 2400; // px/s²

const HURTBOX_HALF_WIDTH = 38;
const HURTBOX_HEIGHT = FIGHTER_HEIGHT - 20;

const FLOPPY_SIZE = 40;
const FLOPPY_SPEED = 540; // px/s
const FLOPPY_HEIGHT = 120; // launch height above the thrower's feet
const THROW_POSE_TIME = 0.3; // s
const THROW_COOLDOWN = 0.55; // s between throws (and only one floppy in flight)

const BASE_DAMAGE = [8, 12]; // random inclusive range
const CRIT_CHANCE = 0.12;
const CRIT_MULTIPLIER = 1.5;
const COMBO_WINDOW = 1.6; // s: hits closer than this chain into a combo
const COMBO_BONUS = 2; // extra damage per combo step…
const COMBO_BONUS_MAX = 6; // …capped here
const BLOCK_CHIP = 0.2; // fraction of damage that gets through a block
const HIT_STUN = 0.4; // s
const BLOCK_STUN = 0.15; // s
const HIT_KNOCKBACK = 34; // px
const BLOCK_KNOCKBACK = 14; // px

const NAMES = ['JAKUB', 'EMILIA'];
const COLORS = ['#0ff', '#f6a'];

/** Physical key (event.code) → [player, action]. Kuba: left side, Emilia: right side. */
const KEYMAP = {
  KeyA: [0, 'left'],
  KeyD: [0, 'right'],
  KeyW: [0, 'jump'],
  KeyS: [0, 'block'],
  KeyF: [0, 'throw'],
  KeyG: [0, 'throw'],
  ArrowLeft: [1, 'left'],
  ArrowRight: [1, 'right'],
  ArrowUp: [1, 'jump'],
  ArrowDown: [1, 'block'],
  Enter: [1, 'throw'],
  NumpadEnter: [1, 'throw'],
  Numpad0: [1, 'throw'],
  KeyL: [1, 'throw'],
};

export const CONTROLS_HELP =
  'KUBA: A/D/W · S block · F throw ║ EMI: ARROWS · DOWN block · ENTER throw';

// ── State ───────────────────────────────────────────────────────────────────
const held = [new Set(), new Set()]; // actions currently held per player
const pressed = [new Set(), new Set()]; // actions pressed since last update

let match;
let lastTime = 0;
let running = false;

const newFighter = (player) => ({
  player,
  x: player ? 760 : 200,
  y: 0, // height above the ground
  vy: 0,
  health: MAX_HEALTH,
  wins: 0,
  dir: player ? -1 : 1, // facing: Kuba looks right, Emilia left
  throwTimer: 0, // remaining throw-pose time
  cooldown: 0,
  stun: 0,
  stunPose: 'hit', // what to show while stunned: 'hit' or 'block'
  blocking: false,
  combo: 0,
  lastHitAt: -Infinity, // match clock of this fighter's last landed hit
  hitsLanded: 0,
});

function newMatch() {
  return {
    phase: 'ready', // ready → intro → fight → roundOver → (intro | matchOver)
    phaseTime: 0,
    round: 0,
    clock: 0, // total match seconds, for combo windows
    timeLeft: ROUND_TIME,
    fighters: [newFighter(0), newFighter(1)],
    floppies: [],
    announced: new Set(), // one-shot announcements per phase
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Back to the "press SPACE" screen with fresh fighters. */
export function resetFight() {
  match?.floppies.forEach((f) => f.el.remove());
  match = newMatch();
  held.forEach((set) => set.clear());
  pressed.forEach((set) => set.clear());
  for (const f of match.fighters) {
    fighter(f.player).classList.remove('ko', 'hit', 'blocking', 'winner', 'airborne');
    setPose(f.player, 'stand');
  }
  render();
  updateHud();
  if (!running) {
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

/** Start (or restart) a match. */
export function startMatch() {
  if (match.phase !== 'ready' && match.phase !== 'matchOver') return;
  resetFight();
  startRound(1);
}

export const isFightActive = () => match && match.phase !== 'ready';

/** Keyboard handling. Returns true if the key belongs to the fight. */
export function handleFightKey(event, isDown) {
  const binding = KEYMAP[event.code];
  if (!binding) return false;
  const [player, action] = binding;
  if (isDown) {
    if (!event.repeat && !held[player].has(action)) pressed[player].add(action);
    held[player].add(action);
  } else {
    held[player].delete(action);
  }
  return true;
}

/** Drop held keys when the window loses focus, so nobody walks forever. */
export function releaseAllKeys() {
  held.forEach((set) => set.clear());
}

// ── Round flow ──────────────────────────────────────────────────────────────

function startRound(round) {
  match.floppies.forEach((f) => f.el.remove());
  match.floppies = [];
  match.round = round;
  match.timeLeft = ROUND_TIME;
  match.fighters.forEach((f) => {
    Object.assign(f, newFighter(f.player), { wins: f.wins, lastHitAt: -Infinity });
    fighter(f.player).classList.remove('ko', 'hit', 'blocking', 'winner');
  });
  setPhase('intro');
  updateHud();
  setCaption('ROUND ' + round, CONTROLS_HELP);
}

function setPhase(phase) {
  match.phase = phase;
  match.phaseTime = 0;
  match.announced.clear();
}

/** Run `fn` once when the current phase has lasted at least `at` seconds. */
function at(seconds, key, fn) {
  if (match.phaseTime >= seconds && !match.announced.has(key)) {
    match.announced.add(key);
    fn();
  }
}

function endRound(reason) {
  const [a, b] = match.fighters;
  const winner = a.health === b.health ? null : a.health > b.health ? a : b;
  if (winner) winner.wins++;
  match.roundWinner = winner;
  match.roundEndReason = reason;
  setPhase('roundOver');
  match.floppies.forEach((f) => f.el.remove());
  match.floppies = [];

  if (reason === 'ko') {
    const loser = winner ? match.fighters[1 - winner.player] : null;
    for (const f of loser ? [loser] : match.fighters) fighter(f.player).classList.add('ko');
    sfx.boom();
    shake();
    banner(winner ? 'K.O.!' : 'DOUBLE K.O.!', '', 1600);
  } else {
    sfx.siren();
    banner('TIME!', '', 1600);
  }
  updateHud();
}

function updatePhase(dt) {
  match.phaseTime += dt;

  if (match.phase === 'intro') {
    at(0, 'round', () => {
      banner('ROUND ' + match.round, '', 1100);
      sfx.zap();
    });
    at(1.2, 'fight', () => {
      banner('FIGHT!', '', 900);
      sfx.fight();
      setPhase('fight');
    });
  } else if (match.phase === 'fight') {
    match.timeLeft = Math.max(0, match.timeLeft - dt);
    if (match.timeLeft === 0) endRound('time');
  } else if (match.phase === 'roundOver') {
    const winner = match.roundWinner;
    at(1.7, 'result', () => {
      if (winner) {
        fighter(winner.player).classList.add('winner');
        const perfect = winner.health === MAX_HEALTH;
        banner(
          NAMES[winner.player] + ' WINS' + (perfect ? '<br>PERFECT!' : ''),
          perfect ? '' : 'small',
          1800,
        );
        if (perfect) sfx.candy();
        else sfx.heal();
      } else {
        banner('DRAW!', '', 1800);
      }
    });
    at(3.8, 'next', () => {
      const champion = match.fighters.find((f) => f.wins >= ROUNDS_TO_WIN);
      if (champion) {
        setPhase('matchOver');
        banner(`${NAMES[champion.player]}<br>WINS THE MATCH!`, '', 4000);
        sfx.candy();
        setCaption(
          'GAME OVER',
          `${NAMES[champion.player]} wins ${champion.wins}–${match.fighters[1 - champion.player].wins}! Press [SPACE] for a rematch · [R] reset`,
        );
      } else {
        startRound(match.round + 1);
      }
    });
  }
}

// ── Simulation ──────────────────────────────────────────────────────────────

const canAct = (f) => match.phase === 'fight' && f.stun <= 0 && f.health > 0;

function updateFighter(f, dt) {
  f.throwTimer = Math.max(0, f.throwTimer - dt);
  f.cooldown = Math.max(0, f.cooldown - dt);
  f.stun = Math.max(0, f.stun - dt);

  const keys = held[f.player];
  const taps = pressed[f.player];
  const grounded = f.y === 0;
  const active = canAct(f);

  // Block: hold, only on the ground, not mid-throw. Blocking roots you in place.
  f.blocking = active && grounded && keys.has('block') && f.throwTimer === 0;

  if (active && !f.blocking) {
    const move = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
    // Walking backwards is a bit slower, as tradition demands.
    const speed = move === f.dir ? WALK_SPEED : WALK_SPEED * 0.8;
    if (f.throwTimer === 0 || !grounded) f.x += move * speed * dt;

    if (taps.has('jump') && grounded) {
      f.vy = JUMP_VELOCITY;
      sfx.zap();
    }
    if (taps.has('throw')) tryThrow(f);
  }

  // Gravity
  if (!grounded || f.vy > 0) {
    f.vy -= GRAVITY * dt;
    f.y = Math.max(0, f.y + f.vy * dt);
    if (f.y === 0) f.vy = 0;
  }
}

function tryThrow(f) {
  const inFlight = match.floppies.some((p) => p.owner === f.player);
  if (f.cooldown > 0 || inFlight) return;
  f.throwTimer = THROW_POSE_TIME;
  f.cooldown = THROW_COOLDOWN;
  sfx.whoosh();

  const el = document.createElement('img');
  el.src = floppySrc;
  el.className = 'floppy p' + f.player;
  el.alt = '';
  $('#fx').appendChild(el);
  match.floppies.push({
    owner: f.player,
    x: f.x + f.dir * 60,
    y: f.y + FLOPPY_HEIGHT, // centre height above the ground
    vx: f.dir * FLOPPY_SPEED,
    spin: 0,
    el,
  });
}

/** Keep fighters inside the arena and apart from each other. */
function resolvePositions() {
  const [a, b] = match.fighters;
  for (const f of match.fighters) f.x = Math.min(ARENA_MAX_X, Math.max(ARENA_MIN_X, f.x));
  const overlap = MIN_GAP - (b.x - a.x);
  if (overlap > 0) {
    // Push both apart, but never through a wall.
    a.x -= overlap / 2;
    b.x += overlap / 2;
    if (a.x < ARENA_MIN_X) {
      b.x += ARENA_MIN_X - a.x;
      a.x = ARENA_MIN_X;
    }
    if (b.x > ARENA_MAX_X) {
      a.x -= b.x - ARENA_MAX_X;
      b.x = ARENA_MAX_X;
    }
  }
}

const overlaps = (floppy, f) =>
  Math.abs(floppy.x - f.x) < HURTBOX_HALF_WIDTH + FLOPPY_SIZE / 2 &&
  floppy.y + FLOPPY_SIZE / 2 > f.y &&
  floppy.y - FLOPPY_SIZE / 2 < f.y + HURTBOX_HEIGHT;

/** Stage-pixel position of a point `height` px above the ground. */
const toStageY = (height) => 540 - GROUND - height;

function updateFloppies(dt) {
  for (const p of match.floppies) {
    p.x += p.vx * dt;
    p.spin += dt * 720 * Math.sign(p.vx);
  }

  // Floppy vs floppy: both shatter.
  const [p0, p1] = [0, 1].map((owner) => match.floppies.find((p) => p.owner === owner));
  if (p0 && p1 && p0.x + FLOPPY_SIZE >= p1.x && Math.abs(p0.y - p1.y) < FLOPPY_SIZE) {
    const x = (p0.x + p1.x) / 2;
    sparks(x, toStageY(p0.y), '#ff0');
    sparks(x, toStageY(p0.y), '#0ff');
    popText('CLASH!', x - 40, toStageY(p0.y) - 40, '#fff', 16);
    sfx.hit();
    p0.dead = p1.dead = true;
  }

  for (const p of match.floppies) {
    if (p.dead) continue;
    const target = match.fighters[1 - p.owner];
    if (target.health > 0 && overlaps(p, target)) {
      p.dead = true;
      landHit(match.fighters[p.owner], target, p);
    } else if (p.x < -FLOPPY_SIZE || p.x > 960 + FLOPPY_SIZE) {
      p.dead = true;
    }
  }

  match.floppies = match.floppies.filter((p) => {
    if (p.dead) p.el.remove();
    return !p.dead;
  });
}

// ── Damage ──────────────────────────────────────────────────────────────────

const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * Damage formula:
 *   base       8–12 (random)
 *   + combo    +2 per consecutive hit landed within 1.6 s of the previous one (max +6)
 *   × crit     ×1.5 with a 12% chance
 *   × block    ×0.2 (chip damage, min 1) if the defender is blocking; blocks break combos
 */
function landHit(attacker, defender, floppy) {
  const hitX = floppy.x;
  const hitY = toStageY(floppy.y);
  // Still in block-stun from a previous blocked floppy counts as blocking.
  const blocked = defender.blocking || (defender.stun > 0 && defender.stunPose === 'block');

  const chained = match.clock - attacker.lastHitAt <= COMBO_WINDOW;
  attacker.combo = blocked ? 0 : chained ? attacker.combo + 1 : 1;
  attacker.lastHitAt = blocked ? -Infinity : match.clock;

  let amount = randomInt(...BASE_DAMAGE);
  amount += Math.min(COMBO_BONUS_MAX, (attacker.combo - 1) * COMBO_BONUS);
  const crit = !blocked && Math.random() < CRIT_CHANCE;
  if (crit) amount *= CRIT_MULTIPLIER;
  if (blocked) amount = Math.max(1, amount * BLOCK_CHIP);
  amount = Math.round(amount);

  const wasSafe = defender.health > DANGER_HEALTH;
  defender.health = Math.max(0, defender.health - amount);
  defender.x += attacker.dir * (blocked ? BLOCK_KNOCKBACK : HIT_KNOCKBACK);
  resolvePositions();

  const popX = defender.x - 40;
  if (blocked) {
    defender.stun = BLOCK_STUN;
    defender.stunPose = 'block';
    sfx.zap();
    sparks(hitX, hitY, '#ffd700');
    popText('BLOCK! -' + amount, popX, hitY - 60, '#ffd700', 14);
  } else {
    attacker.hitsLanded++;
    defender.stun = HIT_STUN;
    defender.stunPose = 'hit';
    defender.combo = 0;
    const el = fighter(defender.player);
    el.classList.remove('hit');
    void el.offsetWidth; // restart the CSS hit animation
    el.classList.add('hit');
    setTimeout(() => el.classList.remove('hit'), 400);
    sfx.hit();
    sparks(hitX, hitY, COLORS[attacker.player]);
    popText('-' + amount + ' HP', popX, hitY - 60, '#f66', crit ? 22 : 16);
    if (crit) {
      shake();
      popText('CRITICAL!', popX - 20, hitY - 100, '#ff0', 18);
    }
    if (attacker.combo >= 2) {
      popText(attacker.combo + ' HIT COMBO!', attacker.player ? 600 : 90, 200, '#ff0', 16);
    }
  }

  updateHud();
  if (defender.health === 0) {
    // A simultaneous hit can KO both; check after this frame's floppies are resolved.
    match.pendingKo = true;
  } else if (wasSafe && defender.health <= DANGER_HEALTH) {
    sfx.lowHealth();
  }
}

// ── Rendering ───────────────────────────────────────────────────────────────

function poseFor(f) {
  if (f.health === 0) return 'hit';
  if (f.stun > 0) return f.stunPose;
  if (f.blocking) return 'block';
  if (f.throwTimer > 0) return 'throw';
  return 'stand';
}

function render() {
  for (const f of match.fighters) {
    const el = fighter(f.player);
    el.style.left = f.x + 'px';
    el.style.right = 'auto';
    el.style.bottom = GROUND + f.y + 'px';
    el.classList.toggle('blocking', f.blocking);
    el.classList.toggle('airborne', f.y > 0);
    if (match.phase !== 'ready') setPose(f.player, poseFor(f));
  }
  for (const p of match.floppies) {
    p.el.style.left = p.x - FLOPPY_SIZE / 2 + 'px';
    p.el.style.top = toStageY(p.y) - FLOPPY_SIZE / 2 + 'px';
    p.el.style.transform = `rotate(${p.spin}deg)`;
  }
}

function updateHud() {
  const [a, b] = match.fighters;
  setHealth(a.health, b.health);
  for (const f of match.fighters) {
    $('#wins-' + f.player).textContent =
      '★'.repeat(f.wins) + '☆'.repeat(Math.max(0, ROUNDS_TO_WIN - f.wins));
  }
  const vs = $('#vs');
  const timer = $('#vs small');
  if (match.phase === 'ready') {
    vs.classList.remove('timer', 'red');
    timer.textContent = 'PRESS SPACE';
  } else {
    const seconds = Math.ceil(match.timeLeft);
    vs.classList.add('timer');
    vs.classList.toggle('red', seconds <= 10);
    timer.textContent = String(seconds).padStart(2, '0');
  }
}

// ── Main loop ───────────────────────────────────────────────────────────────

const STEP = 1 / 120; // fixed simulation step (s)
let accumulator = 0;

function step(dt) {
  match.clock += dt;
  updatePhase(dt);
  for (const f of match.fighters) updateFighter(f, dt);
  pressed.forEach((set) => set.clear());
  resolvePositions();
  updateFloppies(dt);

  if (match.pendingKo && match.phase === 'fight') {
    match.pendingKo = false;
    endRound('ko');
  }
}

function loop(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000); // clamp after tab switches
  lastTime = now;
  if (!state.caseStudyOpen && match.phase !== 'ready') {
    accumulator += elapsed;
    const before = Math.ceil(match.timeLeft);
    while (accumulator >= STEP) {
      step(STEP);
      accumulator -= STEP;
    }
    if (Math.ceil(match.timeLeft) !== before) updateHud();
    render();
  } else {
    accumulator = 0;
    pressed.forEach((set) => set.clear());
  }
  requestAnimationFrame(loop);
}
