import { ATTACKS, PROJECTILES, SPECIALS, environment } from '../attacks/index.js';
import { $, fighter } from './dom.js';
import { state } from './state.js';
import { sfx } from './audio.js';
import { banner, popText, shake, sparks } from './effects.js';
import {
  afterimage,
  aura,
  clearFlashy,
  comboCounter,
  dust,
  fightBurst,
  guardFlash,
  hudHit,
  impact,
  koBlast,
  roundIntro,
  screenFlash,
  setDanger,
  slamText,
  superFlash,
  trail,
  victory,
  zoom,
} from './flashy.js';
import { setCaption, setHealth } from './hud.js';
import { FIGHTER_HEIGHT, setPose } from './sprites.js';
import {
  COLORS,
  DANGER_HEALTH,
  GROUND,
  HITSTOP,
  HURTBOX_HEIGHT,
  MAX_HEALTH,
  SPECIAL_FADE,
  SWARM_COOLDOWN,
  THROW_POSE_TIME,
} from './fight/constants.js';
import { randomInt, toStageY } from './fight/util.js';

/*
 * Two-player fight: a fixed-timestep simulation driven by requestAnimationFrame.
 * Everything time-based (cooldowns, stun, round phases) lives in this module's
 * state and is advanced by update(dt), so a reset just replaces the state —
 * no stray timers survive it.
 */

// ── Tuning ──────────────────────────────────────────────────────────────────
const ROUNDS_TO_WIN = 2; // best of three
const ROUND_TIME = 60; // seconds

const ARENA_MIN_X = 70; // fighter centre limits (stage px)
const ARENA_MAX_X = 890;
const MIN_GAP = 120; // fighters can't walk through each other
const WALK_SPEED = 230; // px/s
const JUMP_VELOCITY = 980; // px/s → peak ≈ 200px
const GRAVITY = 2400; // px/s²

// Every attack, with its styles, assets and counter data, lives in its own folder under
// src/attacks/ (see src/attacks/index.js). This module is the core: movement, counters, damage,
// rounds and the main loop.

// Specials — Kuba: 3 / 4 / 5, Emilia: 8 / 9. Wind-up + speech bubble, then a scene effect on the
// opponent's side and its hit(s); only the matching counter (see LAYOUT) stops them. They share the
// owner's swarm cooldown, and each fighter runs one special at a time (both may have one going).
const SPECIAL_WINDUP = 0.35; // s of throw pose before the effect starts

// Environment attack (src/attacks/environment-attack): belongs to neither player.
const ENV_KEY = 'KeyG';

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

// ── Effects tuning (see flashy.js) ──────────────────────────────────────────
const SUPER_FREEZE = 0.32; // s the whole fight freezes while a super flash plays
const KO_FREEZE = 0.45; // s of hitstop on the K.O. hit…
const KO_SLOWMO = 1.4; // …then this many real seconds…
const KO_SLOWMO_SCALE = 0.3; // …at this game speed
const GHOST_HUE = [140, 280]; // afterimage tint per player (cyan, pink)
const GHOST_INTERVAL = { fast: 0.045, walk: 0.11 }; // s between afterimages
const TRAIL_INTERVAL = 0.018; // s between projectile trail dots

/*
 * Keymap: one keyboard, no numpad. Each player has a movement cluster plus two rows that line up
 * column by column — the number row holds your attacks, the bottom row your blocks. Slot N of
 * your block row counters slot N of your opponent's attack row:
 *
 *   slot      1        2          3              4             5
 *   KUBA  1 floppy  2 no docs  3 fri hotfix   4 AI code-gen  5 undocumented
 *         Z block   X vs bugs  C vs ACs       V vs priority
 *   EMI   6 floppy  7 bugs     8 missing ACs  9 priority
 *         N block   M vs docs  , vs hotfix    . vs code-gen  / vs undocumented
 *
 * Slot 1 is the classic block (hold; 20% chip damage, floppies only). Slots 2+ are counters:
 * press one while that exact attack is incoming and hold it to cancel the hit completely.
 * Pressing a counter when that attack isn't coming whiffs and locks your counters briefly.
 */
const LAYOUT = [
  {
    move: { left: 'KeyA', right: 'KeyD', jump: 'KeyW' },
    attacks: [
      ['Digit1', 'throw'],
      ['Digit2', 'docs'],
      ['Digit3', 'hotfix'],
      ['Digit4', 'codegen'],
      ['Digit5', 'undocumented'],
    ],
    blocks: [
      ['KeyZ', 'block'],
      ['KeyX', 'guard:bugs'],
      ['KeyC', 'guard:acs'],
      ['KeyV', 'guard:priority'],
    ],
  },
  {
    move: { left: 'KeyJ', right: 'KeyL', jump: 'KeyI' },
    attacks: [
      ['Digit6', 'throw'],
      ['Digit7', 'bugs'],
      ['Digit8', 'acs'],
      ['Digit9', 'priority'],
    ],
    blocks: [
      ['KeyN', 'block'],
      ['KeyM', 'guard:docs'],
      ['Comma', 'guard:hotfix'],
      ['Period', 'guard:codegen'],
      ['Slash', 'guard:undocumented'],
    ],
  },
];

/** Physical key (event.code) → [player, action], built from LAYOUT. */
const KEYMAP = {};
LAYOUT.forEach(({ move, attacks, blocks }, player) => {
  for (const [action, code] of Object.entries(move)) KEYMAP[code] = [player, action];
  for (const [code, action] of [...attacks, ...blocks]) KEYMAP[code] = [player, action];
});

const GUARD_PREFIX = 'guard:';
const GUARD_WHIFF_LOCK = 0.6; // s: a counter pressed against nothing locks counters this long

const KEY_LABELS = { Comma: ',', Period: '.', Slash: '/' };
const keyLabel = (code) => KEY_LABELS[code] ?? code.replace(/^(Key|Digit)/, '');

/** Short legend for the caption bar, derived from LAYOUT (e.g. "1-5 attack"). */
export const CONTROLS_HELP = LAYOUT.map(({ move, attacks, blocks }, player) => {
  const span = (keys) => keyLabel(keys[0][0]) + '-' + keyLabel(keys.at(-1)[0]);
  const moves = [move.left, move.jump, move.right].map(keyLabel).join('');
  return `${['KUBA', 'EMI'][player]}: ${moves} move · ${span(attacks)} attack · ${span(blocks)} block`;
}).join(' ║ ');

/** Fill the keymap panel shown before a match (index.html #controls), from LAYOUT. */
export function renderControls() {
  const keycap = (code, label) =>
    `<span class="key-slot"><kbd>${keyLabel(code)}</kbd><small>${label}</small></span>`;
  $('#controls').innerHTML =
    LAYOUT.map(({ move, attacks, blocks }, player) => {
      const blockLabel = (action) =>
        action === 'block'
          ? ATTACKS.throw.counter.label
          : ATTACKS[action.slice(GUARD_PREFIX.length)].label;
      return `
      <div class="controls-player p${player}">
        <h3>${NAMES[player]}</h3>
        <div class="controls-row"><b>MOVE</b>${keycap(move.left, 'left')}${keycap(move.jump, 'jump')}${keycap(move.right, 'right')}</div>
        <div class="controls-row"><b>ATTACK</b>${attacks.map(([code, action]) => keycap(code, ATTACKS[action].label)).join('')}</div>
        <div class="controls-row"><b>BLOCK</b>${blocks.map(([code, action]) => keycap(code, blockLabel(action))).join('')}</div>
      </div>`;
    }).join('') +
    '<p class="controls-note">Same column = same slot: your block in slot N counters your opponent\'s attack in slot N. ' +
    'Slot 1 is held (chip damage); counters must be pressed while that attack is incoming — a wrong guess locks them for a moment.</p>' +
    `<p class="controls-note">${keycap(ENV_KEY, environment.name)} environment attack: the arena quakes and the floor turns to lava — it burns <b>both</b> fighters (jump to dodge a burn).</p>`;
}

const showControls = () =>
  $('#controls').classList.toggle('on', !isFightActive() || match.phase === 'matchOver');

// ── State ───────────────────────────────────────────────────────────────────
const held = [new Set(), new Set()]; // actions currently held per player
const pressed = [new Set(), new Set()]; // actions pressed since last update
let envPressed = false; // ENV_KEY pressed since last update

let match;
let lastTime = 0;

/** What attack modules may use from the core (they never import fight.js: no import cycles). */
const ctx = {
  get match() {
    return match;
  },
  landHit,
  freeze,
  flashFor,
  showSpeech,
  leaveTrail,
  playHitAnimation,
  updateHud,
};
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
  swarmCooldown: 0, // shared by the swarm (bugs / no-docs) and specials
  stun: 0,
  stunPose: 'hit', // what to show while stunned: 'hit' or 'block'
  blocking: false,
  guard: null, // counter currently armed and held (an opponent attack kind), see LAYOUT
  guardLock: 0, // s left of the whiff lockout
  combo: 0,
  lastHitAt: -Infinity, // match clock of this fighter's last landed hit
  hitsLanded: 0,
  ghostTimer: 0, // s until the next afterimage
  wasAirborne: false, // for landing dust
});

/** Fresh state for every stateful attack (floppies, swarms, lava) on `m`, removing their elements. */
function clearAttacks(m) {
  for (const attack of [...PROJECTILES, environment]) attack.clear(m);
}

function newMatch() {
  const m = {
    phase: 'ready', // ready → intro → fight → roundOver → (intro | matchOver)
    phaseTime: 0,
    round: 0,
    clock: 0, // total match seconds, for combo windows
    timeLeft: ROUND_TIME,
    fighters: [newFighter(0), newFighter(1)],
    // + per-attack state, see clearAttacks (floppies, volleys, environment, envCooldown)
    specials: [], // { kind, t, hit, el } per running special (at most one per fighter)
    announced: new Set(), // one-shot announcements per phase
  };
  clearAttacks(m);
  return m;
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Back to the "press SPACE" screen with fresh fighters. */
export function resetFight() {
  clearProjectiles();
  clearFlashy();
  hitstop = 0;
  slowmo = 0;
  $('#fx')
    .querySelectorAll('.speech')
    .forEach((el) => el.remove());
  match = newMatch();
  held.forEach((set) => set.clear());
  pressed.forEach((set) => set.clear());
  envPressed = false;
  for (const f of match.fighters) {
    fighter(f.player).classList.remove('ko', 'hit', 'blocking', 'winner', 'airborne', 'on-lava');
    setPose(f.player, 'stand');
  }
  render();
  updateHud();
  showControls();
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
  if (event.code === ENV_KEY) {
    if (isDown && !event.repeat) envPressed = true;
    return true;
  }
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

function clearProjectiles() {
  if (!match) return;
  clearAttacks(match);
  for (const special of match.specials) special.el?.remove();
  match.specials = [];
}

function startRound(round) {
  clearProjectiles();
  clearFlashy();
  match.round = round;
  match.timeLeft = ROUND_TIME;
  match.fighters.forEach((f) => {
    Object.assign(f, newFighter(f.player), { wins: f.wins, lastHitAt: -Infinity });
    fighter(f.player).classList.remove('ko', 'hit', 'blocking', 'winner');
  });
  setPhase('intro');
  showControls();
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
  clearProjectiles();

  if (reason === 'ko') {
    const loser = winner ? match.fighters[1 - winner.player] : null;
    for (const f of loser ? [loser] : match.fighters) {
      fighter(f.player).classList.add('ko');
      koBlast(f.x, toStageY(f.y + FIGHTER_HEIGHT / 2), COLORS[1 - f.player]);
    }
    freeze(KO_FREEZE);
    slowmo = KO_SLOWMO;
    sfx.boom();
    sfx.heavy();
    shake(3);
    banner(winner ? 'K.O.' : 'DOUBLE K.O.', 'ko', 2000);
  } else {
    sfx.siren();
    screenFlash('#ff2a2a', 300, 0.5);
    zoom(480, 300, 1.08, 1200);
    banner('TIME!', 'ko', 1600);
  }
  updateHud();
}

function updatePhase(dt) {
  match.phaseTime += dt;

  if (match.phase === 'intro') {
    at(0, 'round', () => {
      banner('ROUND ' + match.round, '', 1100);
      roundIntro(match.round);
      sfx.zap();
      sfx.sparkle();
    });
    at(1.2, 'fight', () => {
      banner('FIGHT!', 'fight', 900);
      fightBurst();
      sfx.fight();
      sfx.superFlash();
      for (const f of match.fighters) aura(f.player, COLORS[f.player], 900);
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
        victory(winner.player, winner.x, toStageY(winner.y), COLORS[winner.player]);
        const perfect = winner.health === MAX_HEALTH;
        if (perfect) screenFlash('#ffd700', 400, 0.6);
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
        showControls();
        banner(`${NAMES[champion.player]}<br>WINS THE MATCH!`, '', 4000);
        sfx.candy();
        setCaption(
          'GAME OVER',
          `${NAMES[champion.player]} wins ${champion.wins}–${match.fighters[1 - champion.player].wins}! Press [SPACE] for a rematch · [BACKSPACE] reset`,
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
  f.swarmCooldown = Math.max(0, f.swarmCooldown - dt);
  f.stun = Math.max(0, f.stun - dt);
  f.guardLock = Math.max(0, f.guardLock - dt);

  const keys = held[f.player];
  const taps = pressed[f.player];
  const grounded = f.y === 0;
  const active = canAct(f);

  updateGuard(f, keys, taps);

  // Block: hold, only on the ground, not mid-throw. Blocking roots you in place.
  f.blocking = active && grounded && keys.has('block') && f.throwTimer === 0;

  if (active && !f.blocking && !f.guard) {
    const move = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
    // Walking backwards is a bit slower, as tradition demands.
    const speed = move === f.dir ? WALK_SPEED : WALK_SPEED * 0.8;
    if (f.throwTimer === 0 || !grounded) f.x += move * speed * dt;

    if (taps.has('jump') && grounded) {
      f.vy = JUMP_VELOCITY;
      sfx.zap();
      dust(f.x, toStageY(0), 1.1);
    }
    for (const attack of PROJECTILES) if (taps.has(attack.id)) attack.try(f, ctx);
    for (const kind in SPECIALS) if (taps.has(kind)) trySpecial(f, kind);
  }

  // Gravity
  if (!grounded || f.vy > 0) {
    f.vy -= GRAVITY * dt;
    f.y = Math.max(0, f.y + f.vy * dt);
    if (f.y === 0) f.vy = 0;
  }
  if (f.wasAirborne && f.y === 0) dust(f.x, toStageY(0), 1.3);
  f.wasAirborne = f.y > 0;

  // Afterimages: dense while jumping, attacking or reeling from a hit, sparse while walking.
  const walking = active && (keys.has('left') || keys.has('right')) && !f.blocking && !f.guard;
  const fast = f.y > 0 || f.throwTimer > 0 || (f.stun > 0 && f.stunPose === 'hit');
  f.ghostTimer -= dt;
  if ((fast || walking) && f.ghostTimer <= 0 && match.phase !== 'ready') {
    f.ghostTimer = fast ? GHOST_INTERVAL.fast : GHOST_INTERVAL.walk;
    afterimage(f.player, GHOST_HUE[f.player], fast ? 0.55 : 0.3);
  }
}

/** Is the opponent's attack `kind` currently on its way to fighter `f`? */
function incoming(f, kind) {
  const attack = ATTACKS[kind];
  if (match.phase !== 'fight' || attack?.owner !== 1 - f.player) return false;
  if (attack.type === 'volley') return attack.isIncoming(match);
  return match.specials.some((s) => s.kind === kind && s.hits < [attack.hitAt].flat().length);
}

/**
 * Counters (block row, slots 2+). A fresh press arms the counter only if that exact attack is
 * incoming; any wrong press whiffs and locks counters for GUARD_WHIFF_LOCK. An armed counter
 * lasts while its key is held and the attack is live, works even in hit stun, and roots you.
 */
function updateGuard(f, keys, taps) {
  if (f.health === 0 || match.phase !== 'fight') {
    f.guard = null;
    return;
  }
  const tapped = [...taps]
    .filter((a) => a.startsWith(GUARD_PREFIX))
    .map((a) => a.slice(GUARD_PREFIX.length));
  if (tapped.length && f.guardLock === 0) {
    if (tapped.every((kind) => incoming(f, kind))) {
      f.guard = tapped[0];
    } else {
      f.guard = null;
      f.guardLock = GUARD_WHIFF_LOCK;
      popText('MISS', f.x - 20, toStageY(f.y + FIGHTER_HEIGHT) - 10, '#999', 12);
    }
  }
  if (f.guard && (!keys.has(GUARD_PREFIX + f.guard) || !incoming(f, f.guard))) f.guard = null;
}

const ownerOf = (special) => SPECIALS[special.kind].owner;

/** Super flash for fighter `f` starting attack `kind`: freezes the fight for SUPER_FREEZE. */
function flashFor(f, kind, name, ms) {
  const { color, tint } = ATTACKS[kind].fx;
  superFlash({
    player: f.player,
    x: f.x,
    y: toStageY(f.y + FIGHTER_HEIGHT * 0.55),
    footY: toStageY(f.y),
    color,
    tint,
    name,
    holdMs: ms + SUPER_FREEZE * 1000,
  });
  sfx.superFlash();
  freeze(SUPER_FREEZE);
}

/** A fighter starts one of their specials: announce it, then let updateSpecials play it out. */
function trySpecial(f, kind) {
  const busy = match.specials.some((s) => ownerOf(s) === f.player);
  if (SPECIALS[kind].owner !== f.player || f.swarmCooldown > 0 || busy) return;
  f.throwTimer = SPECIAL_WINDUP + THROW_POSE_TIME;
  f.swarmCooldown = SWARM_COOLDOWN;
  sfx.whoosh();
  showSpeech(f, SPECIALS[kind].name);
  flashFor(
    f,
    kind,
    SPECIALS[kind].name,
    (SPECIAL_WINDUP + SPECIALS[kind].duration + SPECIAL_FADE) * 1000,
  );
  match.specials.push({ kind, t: -SPECIAL_WINDUP, hits: 0, el: null });
}

function updateSpecials(dt) {
  for (const special of match.specials) {
    const spec = SPECIALS[special.kind];
    special.t += dt;
    if (special.t < 0) continue;

    const attacker = match.fighters[spec.owner];
    const target = match.fighters[1 - spec.owner];
    if (!special.el) {
      special.el = spec.build(target);
      special.el.classList.add('special');
      $('#fx').appendChild(special.el);
    }
    // hitAt: one time, or a list of times for a multi-hit special.
    const hitTimes = [spec.hitAt].flat();
    while (special.hits < hitTimes.length && special.t >= hitTimes[special.hits]) {
      const index = special.hits++;
      if (match.phase !== 'fight' || target.health === 0) continue;
      const point = spec.hitPoint?.(special.el, target, special.t, index) ?? {
        x: target.x,
        y: HURTBOX_HEIGHT / 2,
      };
      if (target.guard === special.kind) {
        sfx.zap();
        sfx.guard();
        sparks(point.x, toStageY(point.y), '#ffd700');
        guardFlash(point.x, toStageY(point.y), '#ffd700', target.dir);
        slamText('PERFECT GUARD!', target.x, toStageY(point.y) - 70, '#ffd700', 15);
        freeze(HITSTOP.guard);
      } else {
        landHit(attacker, target, point, { unblockable: true, multiplier: spec.damage ?? 1 });
      }
    }
    if (special.t >= spec.duration) special.el.classList.add('leaving');
    if (special.t >= spec.duration + SPECIAL_FADE) {
      special.el.remove();
      special.done = true;
    }
  }
  match.specials = match.specials.filter((s) => !s.done);
}

/** Speech bubble above a fighter's head; replaces that fighter's previous bubble. */
function showSpeech(f, text) {
  $('#fx')
    .querySelectorAll('.speech.p' + f.player)
    .forEach((el) => el.remove());
  const el = document.createElement('div');
  el.className = 'speech p' + f.player;
  el.textContent = text;
  el.style.left = Math.max(16, f.x - 36) + 'px';
  el.style.top = toStageY(f.y + FIGHTER_HEIGHT) - 72 + 'px';
  $('#fx').appendChild(el);
  setTimeout(() => el.remove(), 2000);
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

/** A projectile drops a glowing trail dot every TRAIL_INTERVAL. */
function leaveTrail(p, dt, color, size) {
  p.trail = (p.trail ?? 0) - dt;
  if (p.trail > 0) return;
  p.trail = TRAIL_INTERVAL;
  trail(p.x - Math.sign(p.vx) * 12, toStageY(p.y), color, size);
}

// ── Damage ──────────────────────────────────────────────────────────────────

/** Restart the fighter's CSS hit animation. */
function playHitAnimation(player) {
  const el = fighter(player);
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
  setTimeout(() => el.classList.remove('hit'), 400);
}

/**
 * Damage formula:
 *   base       8–12 (random)
 *   + combo    +2 per consecutive hit landed within 1.6 s of the previous one (max +6)
 *   × crit     ×1.5 with a 12% chance
 *   × special  ×`multiplier` (e.g. ×2 for "bug priority wars")
 *   × block    ×0.2 (chip damage, min 1) if the defender is blocking; blocks break combos
 * Swarms and specials pass `unblockable`: the hold block (slot 1) doesn't stop them; only the
 * matching counter does (see LAYOUT), and that path never calls this.
 */
function landHit(attacker, defender, projectile, { unblockable = false, multiplier = 1 } = {}) {
  const hitX = projectile.x;
  const hitY = toStageY(projectile.y);
  // Still in block-stun from a previous blocked floppy counts as blocking.
  const blocked =
    !unblockable && (defender.blocking || (defender.stun > 0 && defender.stunPose === 'block'));

  // Hit while winding up an attack: a counter hit (looks louder, same damage).
  const counterHit = !blocked && defender.throwTimer > 0;
  const chained = match.clock - attacker.lastHitAt <= COMBO_WINDOW;
  attacker.combo = blocked ? 0 : chained ? attacker.combo + 1 : 1;
  attacker.lastHitAt = blocked ? -Infinity : match.clock;

  let amount = randomInt(...BASE_DAMAGE);
  amount += Math.min(COMBO_BONUS_MAX, (attacker.combo - 1) * COMBO_BONUS);
  const crit = !blocked && Math.random() < CRIT_CHANCE;
  if (crit) amount *= CRIT_MULTIPLIER;
  amount *= multiplier;
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
    sfx.guard();
    sparks(hitX, hitY, '#ffd700');
    guardFlash(hitX, hitY, '#ffd700', defender.dir);
    dust(defender.x, toStageY(0), 0.7);
    freeze(HITSTOP.block);
    popText('BLOCK! -' + amount, popX, hitY - 60, '#ffd700', 14);
  } else {
    attacker.hitsLanded++;
    defender.stun = HIT_STUN;
    defender.stunPose = 'hit';
    defender.combo = 0;
    playHitAnimation(defender.player);
    sfx.hit();
    const heavy = crit || multiplier > 1 || counterHit;
    if (heavy) sfx.heavy();
    const color = COLORS[attacker.player];
    const power = 1 + (crit ? 0.6 : 0) + (multiplier > 1 ? 0.4 : 0) + (unblockable ? 0.2 : 0);
    sparks(hitX, hitY, color);
    impact(hitX, hitY, color, power);
    dust(defender.x, toStageY(0), 0.9);
    hudHit(defender.player, heavy);
    freeze(crit ? HITSTOP.crit : heavy ? HITSTOP.heavy : HITSTOP.hit);
    shake(heavy ? 2 : 0.8);
    popText('-' + amount + ' HP', popX, hitY - 60, '#f66', crit ? 22 : 16);
    if (crit) {
      screenFlash(color, 160, 0.45);
      zoom(hitX, hitY, 1.18, 500);
      slamText('CRITICAL!', hitX, hitY - 110, '#ffea00', 24);
    }
    if (counterHit) {
      slamText('COUNTER!', defender.x, toStageY(defender.y + FIGHTER_HEIGHT) - 20, '#ff2a2a', 22);
      screenFlash('#ff0030', 120, 0.35);
    }
    comboCounter(attacker.player, attacker.combo);
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
  if (f.guard) return 'block';
  if (f.stun > 0) return f.stunPose;
  if (f.blocking) return 'block';
  if (f.throwTimer > 0) return 'throw'; // a mid-air throw briefly shows the throw pose
  if (f.y > 0) return 'jump';
  return 'stand';
}

function render() {
  for (const f of match.fighters) {
    const el = fighter(f.player);
    el.style.left = f.x + 'px';
    el.style.right = 'auto';
    el.style.bottom = GROUND + f.y + 'px';
    el.classList.toggle('blocking', f.blocking || !!f.guard);
    el.classList.toggle('airborne', f.y > 0);
    el.classList.toggle('on-lava', environment.onLava(f, match));
    if (match.phase !== 'ready') setPose(f.player, poseFor(f));
  }
  for (const attack of PROJECTILES) attack.render(match);
  for (const special of match.specials) {
    const spec = SPECIALS[special.kind];
    const target = match.fighters[1 - spec.owner];
    if (special.el && spec.follow) special.el.style.left = target.x + 'px';
    if (special.el && spec.animate) spec.animate(special.el, target, special.t);
  }
}

function updateHud() {
  const [a, b] = match.fighters;
  setHealth(a.health, b.health);
  for (const f of match.fighters) {
    setDanger(f.player, match.phase !== 'ready' && f.health > 0 && f.health <= DANGER_HEALTH);
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
let hitstop = 0; // s of real time left in which the simulation is frozen
let slowmo = 0; // s of real time left in K.O. slow motion

/** Freeze the fight for `seconds` (hit stop, super flash); overlapping freezes don't add up. */
function freeze(seconds) {
  hitstop = Math.max(hitstop, seconds);
}

function step(dt) {
  match.clock += dt;
  updatePhase(dt);
  for (const f of match.fighters) updateFighter(f, dt);
  pressed.forEach((set) => set.clear());
  resolvePositions();
  for (const attack of PROJECTILES) attack.update(dt, ctx);
  updateSpecials(dt);
  if (envPressed) environment.try(ctx);
  envPressed = false;
  environment.update(dt, ctx);

  if (match.pendingKo && match.phase === 'fight') {
    match.pendingKo = false;
    endRound('ko');
  }
}

function loop(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000); // clamp after tab switches
  lastTime = now;
  if (!state.caseStudyOpen && match.phase !== 'ready') {
    let gameTime = elapsed;
    if (hitstop > 0) {
      const frozen = Math.min(hitstop, gameTime);
      hitstop -= frozen;
      gameTime -= frozen;
    }
    if (slowmo > 0 && gameTime > 0) {
      slowmo = Math.max(0, slowmo - gameTime);
      gameTime *= KO_SLOWMO_SCALE;
    }
    $('#world').classList.toggle('frozen', hitstop > 0);
    accumulator += gameTime;
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
    envPressed = false;
  }
  requestAnimationFrame(loop);
}
