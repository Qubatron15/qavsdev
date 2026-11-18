import { $, fighter, fxLayer } from './dom.js';
import { poseSrc } from './sprites.js';

/*
 * Over-the-top fighting-game effects: hit sparks with rays and shards, super-flash cut-ins,
 * dimmed backgrounds, speed lines, camera punches, afterimages, projectile trails, dust,
 * a combo counter and the ambient light show.
 *
 * World effects go into #fx (inside #world, so they zoom and shake with the camera);
 * screen effects (flashes, cut-ins, speed lines, banners, the combo counter) go into #fx-top.
 * Everything is fire-and-forget: each element removes itself when its animation ends, and
 * clearFlashy() wipes whatever is still running (reset, round change).
 */

const world = $('#world');
const fxTop = $('#fx-top');
const dimLayer = $('#dim');
const vignette = $('#vignette');

/** Hard cap on live world particles so a frantic exchange can't melt the laptop on stage. */
const MAX_PARTICLES = 900;
const crowded = () => fxLayer.childElementCount > MAX_PARTICLES;

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// ── Plumbing ────────────────────────────────────────────────────────────────

const timers = new Set();

/** setTimeout that clearFlashy() cancels, so nothing fires into a freshly reset arena. */
function later(ms, fn) {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
}

/** A div in `layer`, its centre at (x, y) when given a size. */
function make(layer, className, x, y, size = 0, styles = {}) {
  const el = document.createElement('div');
  el.className = className;
  if (x !== null) el.style.left = x + 'px';
  if (y !== null) el.style.top = y + 'px';
  if (size) {
    el.style.width = el.style.height = size + 'px';
    el.style.marginLeft = el.style.marginTop = -size / 2 + 'px';
  }
  for (const [key, value] of Object.entries(styles)) {
    if (key.startsWith('--')) el.style.setProperty(key, value);
    else el.style[key] = value;
  }
  layer.appendChild(el);
  return el;
}

/** Play keyframes on a throwaway element and remove it when they're done. */
function play(el, keyframes, options) {
  const anim = el.animate(keyframes, { fill: 'both', easing: 'ease-out', ...options });
  anim.onfinish = () => el.remove();
  return anim;
}

const withColor = (el, color) => (el.style.setProperty('--c', color), el);

// ── Building blocks ─────────────────────────────────────────────────────────

/** Full-screen flash of `color`. */
export function screenFlash(color = '#fff', ms = 120, opacity = 0.8) {
  const el = make(fxTop, 'fx-screen', 0, 0, 0, { background: color });
  play(el, [{ opacity }, { opacity: 0 }], { duration: ms, easing: 'ease-in' });
}

/** Starburst of rays (conic gradient) spinning out of a point. */
function rays(layer, x, y, size, color, ms = 300, spin = 25) {
  const el = withColor(make(layer, 'fx-burst', x, y, size), color);
  const r = rand(0, 360);
  play(
    el,
    [
      { transform: `rotate(${r}deg) scale(0.3)`, opacity: 1 },
      { transform: `rotate(${r + spin}deg) scale(1.15)`, opacity: 0 },
    ],
    { duration: ms },
  );
}

function ring(layer, x, y, size, color, ms = 420, delay = 0, grow = 3) {
  const el = withColor(make(layer, 'fx-ring', x, y, size), color);
  play(
    el,
    [
      { transform: 'scale(0.2)', opacity: 1 },
      { transform: `scale(${grow})`, opacity: 0 },
    ],
    { duration: ms, delay },
  );
}

/** Four-point twinkling stars flying out of a point. */
function sparkles(layer, x, y, count, color, reach = 120, up = 0) {
  for (let i = 0; i < count; i++) {
    const size = rand(10, 26);
    const el = withColor(
      make(layer, 'fx-sparkle', x, y, size),
      Math.random() < 0.4 ? '#fff' : color,
    );
    const angle = rand(0, Math.PI * 2);
    const dist = rand(reach * 0.35, reach);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - up;
    const spin = rand(-180, 180);
    play(
      el,
      [
        { transform: 'scale(0)', opacity: 1 },
        {
          transform: `translate(${dx * 0.6}px,${dy * 0.6}px) scale(1.3) rotate(${spin / 2}deg)`,
          opacity: 1,
          offset: 0.3,
        },
        {
          transform: `translate(${dx * 0.8}px,${dy * 0.8}px) scale(0.5)`,
          opacity: 0.3,
          offset: 0.55,
        },
        { transform: `translate(${dx * 0.9}px,${dy * 0.9}px) scale(1)`, opacity: 1, offset: 0.75 },
        { transform: `translate(${dx}px,${dy + 20}px) scale(0) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: rand(650, 1050), delay: rand(0, 80) },
    );
  }
}

/** Angular glass-like shards. */
function shards(x, y, count, color, reach) {
  for (let i = 0; i < count; i++) {
    const el = withColor(make(fxLayer, 'fx-shard', x, y), color);
    const angle = rand(0, Math.PI * 2);
    const dist = rand(reach * 0.5, reach);
    const deg = (angle * 180) / Math.PI + 90;
    play(
      el,
      [
        { transform: `rotate(${deg}deg) scale(1.4)`, opacity: 1 },
        {
          transform: `translate(${Math.cos(angle) * dist}px,${Math.sin(angle) * dist + 30}px) rotate(${deg + rand(-200, 200)}deg) scale(0.2)`,
          opacity: 0,
        },
      ],
      { duration: rand(380, 620), easing: 'cubic-bezier(.1,.8,.3,1)' },
    );
  }
}

/** Long thin slash lines through the impact point. */
function slashes(x, y, count, color, length) {
  for (let i = 0; i < count; i++) {
    const el = withColor(
      make(fxLayer, 'fx-slash', x, y, 0, {
        width: length + 'px',
        marginLeft: -length / 2 + 'px',
      }),
      color,
    );
    const a = rand(-70, 70) + (i % 2 ? 90 : 0);
    play(
      el,
      [
        { transform: `rotate(${a}deg) scaleX(0)`, opacity: 1 },
        { transform: `rotate(${a}deg) scaleX(1)`, opacity: 1, offset: 0.35 },
        { transform: `rotate(${a}deg) scaleX(1.15) scaleY(0)`, opacity: 0 },
      ],
      { duration: 240, delay: i * 25 },
    );
  }
}

/** Speed streaks shooting radially out of the impact. */
function streaks(x, y, count, color, reach) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, 360);
    const el = withColor(make(fxLayer, 'fx-streak', x, y), color);
    play(
      el,
      [
        { transform: `rotate(${angle}deg) translateX(10px) scaleX(0.2)`, opacity: 1 },
        { transform: `rotate(${angle}deg) translateX(${reach}px) scaleX(1)`, opacity: 0 },
      ],
      { duration: rand(220, 360) },
    );
  }
}

// ── Hits & guards ───────────────────────────────────────────────────────────

/** The big one: every hit gets a core flash, rays, rings, slashes, shards, streaks and sparkles. */
export function impact(x, y, color, power = 1) {
  if (crowded()) power = Math.min(power, 0.6);
  const core = withColor(make(fxLayer, 'fx-core', x, y, 140 * power), color);
  play(
    core,
    [
      { transform: 'scale(0.2)', opacity: 1 },
      { transform: 'scale(1.4)', opacity: 0 },
    ],
    { duration: 260 },
  );
  rays(fxLayer, x, y, 280 * power, color, 320, 30);
  rays(fxLayer, x, y, 180 * power, '#fff', 260, -40);
  ring(fxLayer, x, y, 70 * power, color, 420);
  ring(fxLayer, x, y, 50 * power, '#fff', 360, 60, 2.4);
  slashes(x, y, power > 1.2 ? 4 : 3, color, 300 * power);
  streaks(x, y, Math.round(10 * power), '#fff', 170 * power);
  shards(x, y, Math.round(10 * power), color, 160 * power);
  sparkles(fxLayer, x, y, Math.round(8 * power), color, 140 * power, 30);
}

/** A hexagonal barrier flashes in front of the defender, with a ring and sparkles. */
export function guardFlash(x, y, color = '#ffd700', dir = 1) {
  const hex = withColor(make(fxLayer, 'fx-hex', x - dir * 30, y, 150), color);
  play(
    hex,
    [
      { transform: 'scale(0.4) rotate(-20deg)', opacity: 1 },
      { transform: 'scale(1.05)', opacity: 1, offset: 0.25 },
      { transform: 'scale(1.25)', opacity: 0 },
    ],
    { duration: 420 },
  );
  const inner = withColor(make(fxLayer, 'fx-hex inner', x - dir * 30, y, 100), '#fff');
  play(
    inner,
    [
      { transform: 'scale(0.6)', opacity: 0.9 },
      { transform: 'scale(1.3)', opacity: 0 },
    ],
    { duration: 300 },
  );
  ring(fxLayer, x, y, 60, color, 380);
  rays(fxLayer, x, y, 200, color, 260, 15);
  sparkles(fxLayer, x, y, 10, color, 110, 20);
}

/** Puffs of dust and a shockwave ellipse at a fighter's feet (jump, land, knockback). */
export function dust(x, groundY, strength = 1) {
  if (crowded()) return;
  for (let i = 0; i < 7; i++) {
    const size = rand(14, 30) * strength;
    const el = make(fxLayer, 'fx-dust', x + rand(-20, 20), groundY - size / 3, size);
    const dx = (i % 2 ? 1 : -1) * rand(30, 80) * strength;
    play(
      el,
      [
        { transform: 'scale(0.4)', opacity: 0.85 },
        { transform: `translate(${dx}px,${-rand(10, 34)}px) scale(1.6)`, opacity: 0 },
      ],
      { duration: rand(380, 560) },
    );
  }
  const wave = make(fxLayer, 'fx-groundwave', x, groundY, 0, {
    width: 140 * strength + 'px',
    marginLeft: -70 * strength + 'px',
  });
  play(
    wave,
    [
      { transform: 'scaleX(0.2)', opacity: 0.9 },
      { transform: 'scaleX(1.5)', opacity: 0 },
    ],
    { duration: 380 },
  );
}

/** Glowing dot left behind by a projectile; call it often. */
export function trail(x, y, color, size = 18) {
  if (crowded()) return;
  const el = withColor(make(fxLayer, 'fx-trail', x, y, size), color);
  play(
    el,
    [
      { transform: 'scale(1)', opacity: 0.9 },
      { transform: `translate(${rand(-6, 6)}px,${rand(-6, 6)}px) scale(0.15)`, opacity: 0 },
    ],
    { duration: 280 },
  );
  if (Math.random() < 0.25) sparkles(fxLayer, x, y, 1, color, 30);
}

/** Muzzle flash where a projectile leaves the hand. */
export function muzzle(x, y, color) {
  rays(fxLayer, x, y, 120, color, 220, 20);
  ring(fxLayer, x, y, 30, '#fff', 260, 0, 2.6);
  sparkles(fxLayer, x, y, 4, color, 60);
}

/** Tinted silhouette of a fighter's current sprite that fades where it stood. */
export function afterimage(player, hue, opacity = 0.55) {
  if (crowded()) return;
  const img = fighter(player).querySelector('img');
  if (!img?.src) return;
  const worldRect = world.getBoundingClientRect();
  const rect = img.getBoundingClientRect();
  const scale = worldRect.width / 960;
  const ghost = document.createElement('img');
  ghost.src = img.src;
  ghost.alt = '';
  ghost.className = 'fx-ghost';
  Object.assign(ghost.style, {
    left: (rect.left - worldRect.left) / scale + 'px',
    top: (rect.top - worldRect.top) / scale + 'px',
    height: rect.height / scale + 'px',
    filter: `brightness(0.7) sepia(1) saturate(9) hue-rotate(${hue}deg) brightness(1.3)`,
  });
  fxLayer.appendChild(ghost);
  play(ghost, [{ opacity }, { opacity: 0, transform: 'scale(1.04)' }], { duration: 320 });
}

// ── Camera ──────────────────────────────────────────────────────────────────

let zoomAnim;

/** Zoom the world toward (x, y), hold, and ease back. */
export function zoom(x, y, scale = 1.12, ms = 600, hold = 0.55) {
  zoomAnim?.cancel();
  world.style.transformOrigin = `${x}px ${y}px`;
  zoomAnim = world.animate(
    [
      { transform: 'scale(1)' },
      { transform: `scale(${scale})`, offset: 0.15, easing: 'ease-in-out' },
      { transform: `scale(${scale * 1.01})`, offset: hold },
      { transform: 'scale(1)' },
    ],
    { duration: ms, easing: 'ease-out' },
  );
}

/** Screen shake on top of any zoom (composite: add), scaled by `power`. */
export function shakeWorld(power = 1) {
  const p = (dx, dy) => ({ transform: `translate(${dx * power}px,${dy * power}px)` });
  world.animate([p(0, 0), p(-10, 6), p(9, -7), p(-7, 4), p(5, -3), p(-2, 1), p(0, 0)], {
    duration: 260 + 90 * power,
    composite: 'add',
  });
}

// ── Super flash ─────────────────────────────────────────────────────────────

let dimAnim;

/** Dim everything behind the fighters (tinted toward `tint`) for `ms`. */
export function dim(tint, ms, depth = 0.72) {
  dimAnim?.cancel();
  dimLayer.style.background = `radial-gradient(ellipse at 50% 85%, ${tint}cc, ${tint}44 45%, #0000 75%), #05010c`;
  dimAnim = dimLayer.animate(
    [
      { opacity: 0 },
      { opacity: 0.92, offset: 0.06 },
      { opacity: depth, offset: 0.22 },
      { opacity: depth, offset: 0.85 },
      { opacity: 0 },
    ],
    { duration: ms, fill: 'both' },
  );
}

/** Radial speed lines centred on (x, y), flickering. */
function speedLines(x, y, color, ms = 750) {
  for (const [i, c] of [
    [0, '#fff'],
    [1, color],
  ].entries()) {
    const el = make(fxTop, 'fx-speedlines', 0, 0, 0, {
      '--x': x + 'px',
      '--y': y + 'px',
      '--c': c,
      '--from': i * 3 + 'deg',
    });
    play(
      el,
      [
        { opacity: 0 },
        { opacity: 0.75, offset: 0.08 },
        { opacity: 0.35, offset: 0.2 },
        { opacity: 0.7, offset: 0.32 },
        { opacity: 0.3, offset: 0.5 },
        { opacity: 0.6, offset: 0.7 },
        { opacity: 0 },
      ],
      { duration: ms, delay: i * 40, easing: 'steps(1)' },
    );
  }
}

/** The portrait cut-in: a skewed band slams across the screen with the fighter and the move name. */
function cutIn(player, name, color, ms = 820) {
  const side = player ? 'right' : 'left';
  const dir = player ? 1 : -1; // enter from the fighter's own side
  const root = withColor(make(fxTop, 'cutin ' + side, null, null), color);
  const band = document.createElement('div');
  band.className = 'cutin-band';
  const face = document.createElement('img');
  face.className = 'cutin-face';
  face.src = poseSrc(player, 'throw') || poseSrc(player, 'stand');
  face.alt = '';
  const title = document.createElement('div');
  title.className = 'cutin-name';
  title.textContent = name.toUpperCase();
  band.append(face, title);
  root.append(band);
  // Cinematic letterbox
  for (const where of ['top', 'bottom']) {
    const bar = make(fxTop, 'letterbox ' + where, null, null);
    play(
      bar,
      [
        { transform: 'scaleY(0)' },
        { transform: 'scaleY(1)', offset: 0.12 },
        { transform: 'scaleY(1)', offset: 0.85 },
        { transform: 'scaleY(0)' },
      ],
      { duration: ms + 120 },
    );
  }
  band.animate(
    [
      { transform: `translateX(${dir * 110}%)` },
      { transform: 'translateX(0)', offset: 0.14, easing: 'linear' },
      { transform: `translateX(${-dir * 3}%)`, offset: 0.8, easing: 'ease-in' },
      { transform: `translateX(${-dir * 115}%)` },
    ],
    { duration: ms, fill: 'both' },
  );
  face.animate(
    [
      { transform: 'scale(1.25)', filter: 'brightness(4)' },
      { transform: 'scale(1)', filter: 'brightness(1)', offset: 0.2 },
      { transform: `translateX(${-dir * 26}px) scale(1.04)` },
    ],
    { duration: ms, fill: 'both' },
  );
  title.animate(
    [
      { transform: `translateX(${-dir * 400}px) skewX(-14deg)`, opacity: 0 },
      { transform: 'translateX(0) skewX(-14deg)', opacity: 1, offset: 0.2 },
      { transform: `translateX(${dir * 18}px) skewX(-14deg)`, opacity: 1 },
    ],
    { duration: ms, fill: 'both' },
  );
  play(root, [{ opacity: 1 }, { opacity: 1 }], { duration: ms });
}

/** Column of light from the sky onto a fighter, with a glowing floor ellipse. */
function pillar(x, footY, color, ms = 800, width = 130) {
  const beam = withColor(
    make(fxLayer, 'fx-pillar', x, 0, 0, {
      width: width + 'px',
      marginLeft: -width / 2 + 'px',
      height: footY + 'px',
    }),
    color,
  );
  play(
    beam,
    [
      { transform: 'scaleX(0)', opacity: 1 },
      { transform: 'scaleX(1.2)', opacity: 1, offset: 0.15 },
      { transform: 'scaleX(0.8)', opacity: 0.8, offset: 0.6 },
      { transform: 'scaleX(0)', opacity: 0 },
    ],
    { duration: ms },
  );
  const pool = withColor(
    make(fxLayer, 'fx-pool', x, footY, 0, { width: width * 2 + 'px', marginLeft: -width + 'px' }),
    color,
  );
  play(
    pool,
    [
      { opacity: 1, transform: 'scaleX(0.3)' },
      { opacity: 0, transform: 'scaleX(1.4)' },
    ],
    {
      duration: ms,
    },
  );
}

/** Sparkles rising from a fighter's feet. */
function rising(x, footY, color, count = 16) {
  for (let i = 0; i < count; i++) {
    const size = rand(8, 20);
    const el = withColor(
      make(fxLayer, 'fx-sparkle', x + rand(-60, 60), footY - rand(0, 30), size),
      color,
    );
    play(
      el,
      [
        { transform: 'scale(0)', opacity: 1 },
        { transform: 'scale(1.2)', opacity: 1, offset: 0.2 },
        {
          transform: `translate(${rand(-30, 30)}px,${-rand(160, 300)}px) scale(0.2) rotate(${rand(-180, 180)}deg)`,
          opacity: 0,
        },
      ],
      { duration: rand(700, 1200), delay: rand(0, 300) },
    );
  }
}

/** Fighter glows in `color` for a while (CSS class .super). */
export function aura(player, color, ms = 1200) {
  const el = fighter(player);
  el.style.setProperty('--aura', color);
  el.classList.add('super');
  clearTimeout(el.auraTimer);
  el.auraTimer = setTimeout(() => el.classList.remove('super'), ms);
}

/**
 * Everything at once when a fighter starts an attack: flash, dim, speed lines, cut-in,
 * light pillar, sparkles, aura and a camera push toward the attacker.
 */
export function superFlash({ player, x, y, footY, color, tint, name, holdMs }) {
  screenFlash('#fff', 140, 0.85);
  dim(tint, holdMs);
  speedLines(x, y, color);
  cutIn(player, name, color);
  pillar(x, footY, color);
  rising(x, footY, color, 18);
  rays(fxLayer, x, y, 420, color, 520, 60);
  ring(fxLayer, x, y, 90, color, 520, 0, 3.4);
  ring(fxLayer, x, y, 60, '#fff', 420, 100, 3);
  sparkles(fxLayer, x, y, 12, color, 160, 20);
  aura(player, color, holdMs);
  zoom(x, y, 1.14, 700);
}

// ── Text, HUD & big moments ─────────────────────────────────────────────────

const combos = [];

/** Fighting-game combo counter on the attacker's side: huge number, "HITS", slam on every hit. */
export function comboCounter(player, hits) {
  if (hits < 2) return;
  let el = combos[player];
  if (!el?.isConnected) {
    el = combos[player] = make(fxTop, 'combo-counter p' + player, null, null);
  }
  el.innerHTML = `<b>${hits}</b><span>HITS</span><i>${pick(['NICE!', 'GREAT!', 'SICK!', 'WOW!', 'CHAIN!'])}</i>`;
  el.classList.remove('off');
  el.getAnimations().forEach((a) => a.cancel());
  el.animate(
    [
      { transform: 'scale(2.2) skewX(-12deg)', filter: 'brightness(3)' },
      { transform: 'scale(0.9) skewX(-12deg)', filter: 'brightness(1)', offset: 0.4 },
      { transform: 'scale(1) skewX(-12deg)' },
    ],
    { duration: 260, easing: 'ease-out' },
  );
  clearTimeout(el.hideTimer);
  el.hideTimer = setTimeout(() => el.classList.add('off'), 1700);
}

/** Slanted label slammed onto the screen (COUNTER!, PERFECT GUARD!, etc.). */
export function slamText(text, x, y, color = '#ff2a2a', size = 26) {
  const el = make(fxTop, 'slam-text', x, y, 0, { color, fontSize: size + 'px' });
  el.textContent = text;
  play(
    el,
    [
      { transform: 'translate(-50%,-50%) scale(3) skewX(-14deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(0.9) skewX(-14deg)', opacity: 1, offset: 0.12 },
      { transform: 'translate(-50%,-50%) scale(1) skewX(-14deg)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%,-80%) scale(1.1) skewX(-14deg)', opacity: 0 },
    ],
    { duration: 900 },
  );
}

/** Health bar and portrait of the player who got hit shake and flash white. */
export function hudHit(player, heavy = false) {
  const bar = $('#health-bar-' + player);
  const portrait = $(player ? '#portrait-qa' : '#portrait-dev');
  const k = heavy ? 2 : 1;
  bar.animate(
    [
      { transform: 'none', filter: 'brightness(3)' },
      { transform: `translate(${-4 * k}px,${2 * k}px)` },
      { transform: `translate(${4 * k}px,${-2 * k}px)` },
      { transform: 'none', filter: 'none' },
    ],
    { duration: 220 },
  );
  portrait.animate([{ filter: 'brightness(4) saturate(0)' }, { filter: 'none' }], {
    duration: 260,
  });
}

/** K.O.: inverted flash, giant rays, a chain of explosions and a long camera push. */
export function koBlast(x, y, color) {
  screenFlash('#fff', 380, 1);
  world.animate(
    [
      { filter: 'invert(1) contrast(1.6)' },
      { filter: 'invert(1) contrast(1.6)', offset: 0.5 },
      { filter: 'grayscale(1) contrast(1.3)', offset: 0.55 },
      { filter: 'none' },
    ],
    { duration: 700 },
  );
  const giant = withColor(make(fxTop, 'fx-burst giant', x, y, 1400), color);
  play(
    giant,
    [
      { transform: 'scale(0.1) rotate(0deg)', opacity: 1 },
      { transform: 'scale(1) rotate(30deg)', opacity: 0.9, offset: 0.3 },
      { transform: 'scale(1.2) rotate(70deg)', opacity: 0 },
    ],
    { duration: 1600 },
  );
  for (let i = 0; i < 5; i++) {
    later(i * 110, () => {
      impact(x + rand(-50, 50), y + rand(-70, 40), i % 2 ? '#fff' : color, 1.8 - i * 0.15);
      shakeWorld(3 - i * 0.4);
    });
  }
  ring(fxTop, x, y, 120, '#fff', 900, 0, 6);
  ring(fxTop, x, y, 120, color, 1100, 150, 7);
  sparkles(fxTop, x, y, 30, color, 380, 40);
  zoom(x, y, 1.3, 1800, 0.7);
}

/** ROUND N: stripes sweep the screen behind the banner, sparkles fly out of the middle. */
export function roundIntro(round) {
  dim('#5b2bff', 1250, 0.45);
  for (let i = 0; i < 6; i++) {
    const bar = make(fxTop, 'fx-wipe', null, 150 + i * 42, 0, { '--i': i });
    play(
      bar,
      [
        { transform: `translateX(${i % 2 ? 110 : -110}%) skewX(-30deg)`, opacity: 1 },
        { transform: 'translateX(0) skewX(-30deg)', opacity: 0.9, offset: 0.35 },
        { transform: `translateX(${i % 2 ? -110 : 110}%) skewX(-30deg)`, opacity: 0 },
      ],
      { duration: 900, delay: i * 40, easing: 'cubic-bezier(.2,.9,.3,1)' },
    );
  }
  sparkles(fxTop, 480, 230, 20, '#ffd700', 320);
  ring(fxTop, 480, 230, 120, '#ffd700', 700, 0, 5);
  later(200, () =>
    slamText(
      pick(['BUG OR FEATURE?', 'SHIP IT OR SKIP IT!', 'NO MERCY. NO MERGE.']),
      480,
      300,
      '#0ff',
      13,
    ),
  );
  if (round === 3) later(350, () => slamText('FINAL ROUND', 480, 140, '#ff2a2a', 20));
}

/** FIGHT!: white flash, a starburst from the centre and a shake. */
export function fightBurst() {
  screenFlash('#fff', 200, 0.9);
  rays(fxTop, 480, 230, 1100, '#ff3fa4', 700, 40);
  rays(fxTop, 480, 230, 800, '#ffd700', 600, -40);
  ring(fxTop, 480, 230, 140, '#fff', 600, 0, 6);
  sparkles(fxTop, 480, 230, 26, '#ffd700', 420);
  shakeWorld(2);
}

/** Winner: light pillar, rising sparkles for a couple of seconds, aura. */
export function victory(player, x, footY, color) {
  aura(player, color, 2600);
  pillar(x, footY, color, 1600, 170);
  for (let i = 0; i < 6; i++) later(i * 300, () => rising(x, footY, i % 2 ? '#fff' : color, 10));
  sparkles(fxLayer, x, footY - 120, 20, '#ffd700', 220, 40);
}

/** Pulsing red vignette while either fighter is in danger, plus a red aura on that fighter. */
const danger = [false, false];
export function setDanger(player, on) {
  danger[player] = on;
  fighter(player).classList.toggle('danger', on);
  vignette.classList.toggle('danger', danger.some(Boolean));
}

/** Drop every running effect (reset / new round). */
export function clearFlashy() {
  for (const id of timers) clearTimeout(id);
  timers.clear();
  fxTop.innerHTML = '';
  combos.length = 0;
  dimAnim?.cancel();
  zoomAnim?.cancel();
  world.getAnimations().forEach((a) => a.cancel());
  for (const player of [0, 1]) {
    fighter(player).classList.remove('super');
    setDanger(player, false);
  }
}

/** Fill #ambient once: rotating god rays, drifting motes and a floor sheen. */
export function initAmbient() {
  const ambient = $('#ambient');
  ambient.innerHTML =
    '<div class="godrays a"></div><div class="godrays b"></div><div class="floor-sheen"></div>';
  const colors = ['#0ff', '#ff3fa4', '#ffd700', '#fff', '#b040ff'];
  for (let i = 0; i < 44; i++) {
    const mote = document.createElement('span');
    mote.className = 'mote';
    const size = rand(2, 6);
    Object.assign(mote.style, {
      left: rand(0, 960) + 'px',
      top: rand(120, 520) + 'px',
      width: size + 'px',
      height: size + 'px',
      animationDuration: rand(4, 9) + 's, ' + rand(0.8, 2) + 's',
      animationDelay: -rand(0, 9) + 's, ' + -rand(0, 2) + 's',
    });
    mote.style.setProperty('--c', pick(colors));
    mote.style.setProperty('--drift', rand(-60, 60) + 'px');
    ambient.appendChild(mote);
  }
}
