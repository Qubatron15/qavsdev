import './style.css';
import { $ } from '../../js/dom.js';
import { sfx } from '../../js/audio.js';
import { banner, popText, shake, sparks } from '../../js/effects.js';
import { dim, hudHit, impact, quake, screenFlash } from '../../js/flashy.js';
import { DANGER_HEALTH, HURTBOX_HEIGHT, SPECIAL_FADE } from '../../js/fight/constants.js';
import { makeEl, rand, randomInt, toStageY } from '../../js/fight/util.js';

const ENV_DURATION = 2.8; // s of quake + lava
const ENV_LAVA_AT = 0.5; // s of quaking (floor cracks) before the lava rises
const ENV_BURN_TIMES = [0.8, 1.5, 2.2]; // s: one burn tick each
const ENV_BURN = [2, 4]; // damage per tick, random inclusive (≈ 9 HP in total)
const ENV_BURN_STUN = 0.12; // s of hit pose per burn
const ENV_COOLDOWN = 8; // s after it ends before it can be triggered again
const ENV_FX = { color: '#ff6a00', tint: '#a01800' };
const ENV_STATUS = 'STAGING: 503 · DB: FLAKY · CI: RED';

/** Cracks glow in the floor while it quakes, then lava rises over the whole front strip. */
function buildLava() {
  const root = makeEl('div', 'flaky-env');
  const floorY = toStageY(0);
  const status = makeEl('div', 'env-status');
  status.textContent = ENV_STATUS;
  root.appendChild(status);
  for (let i = 0; i < 9; i++) {
    const crack = makeEl('div', 'lava-crack', {
      left: rand(0, 900) + 'px',
      top: floorY + rand(4, 50) + 'px',
      width: rand(40, 130) + 'px',
      animationDelay: rand(0, ENV_LAVA_AT * 0.8) + 's',
    });
    crack.style.setProperty('--rot', rand(-25, 25) + 'deg');
    root.appendChild(crack);
  }
  const lava = makeEl('div', 'lava', {
    top: floorY - 10 + 'px',
    animationDelay: ENV_LAVA_AT + 's, 0s',
  });
  for (let i = 0; i < 16; i++) {
    const size = rand(6, 16) + 'px';
    lava.appendChild(
      makeEl('span', 'lava-bubble', {
        left: rand(0, 950) + 'px',
        bottom: rand(10, 50) + 'px',
        width: size,
        height: size,
        animationDelay: ENV_LAVA_AT + rand(0, 1) + 's',
        animationDuration: rand(0.6, 1.1) + 's',
      }),
    );
  }
  root.appendChild(lava);
  for (let i = 0; i < 30; i++) {
    const ember = makeEl('span', 'ember', {
      left: rand(0, 960) + 'px',
      top: floorY + 'px',
      animationDelay: ENV_LAVA_AT + rand(0, 1.6) + 's',
      animationDuration: rand(1, 1.8) + 's',
    });
    ember.style.setProperty('--drift', rand(-50, 50) + 'px');
    root.appendChild(ember);
  }
  return root;
}

/** One burn tick: everyone on the ground takes a little damage; airborne fighters are safe. */
function burn(f, ctx) {
  if (f.health === 0) return;
  if (f.y > 0) {
    popText('SAFE!', f.x - 24, toStageY(f.y) + 10, '#ffd700', 12);
    return;
  }
  const amount = randomInt(...ENV_BURN);
  const wasSafe = f.health > DANGER_HEALTH;
  f.health = Math.max(0, f.health - amount);
  f.stun = Math.max(f.stun, ENV_BURN_STUN);
  f.stunPose = 'hit';
  ctx.playHitAnimation(f.player);
  sparks(f.x, toStageY(10), ENV_FX.color);
  impact(f.x, toStageY(6), ENV_FX.color, 0.5);
  hudHit(f.player, false);
  popText('-' + amount + ' HP', f.x - 40, toStageY(HURTBOX_HEIGHT) - 20, '#ff8a00', 16);
  if (f.health === 0) ctx.match.pendingKo = true;
  else if (wasSafe && f.health <= DANGER_HEALTH) sfx.lowHealth();
}

/**
 * "flaky environments" — belongs to neither player (key G, see ENV_KEY in fight.js). Everything
 * quakes, the floor turns to lava, and each burn tick hurts whoever is standing on it.
 * Counter: jump — an airborne fighter dodges that tick.
 */
export default {
  id: 'environment',
  type: 'environment',
  owner: null,
  name: 'flaky environments',
  label: 'flaky environments',
  fx: ENV_FX,

  clear(match) {
    match.environment?.el.remove();
    match.environment = null;
    match.envCooldown = 0;
  },

  /** Someone pressed the key: the whole arena starts to shake, and the lava follows. */
  try(ctx) {
    const { match } = ctx;
    if (match.phase !== 'fight' || match.environment || match.envCooldown > 0) return;
    const el = buildLava();
    el.classList.add('special');
    $('#fx').appendChild(el);
    match.environment = { t: 0, burns: 0, el };
    banner('FLAKY<br>ENVIRONMENTS!', 'small', 1500);
    screenFlash(ENV_FX.color, 260, 0.45);
    dim(ENV_FX.tint, (ENV_DURATION + SPECIAL_FADE) * 1000, 0.45);
    quake((ENV_DURATION + SPECIAL_FADE) * 1000, 1.1);
    sfx.quake();
    for (const f of match.fighters) {
      ctx.showSpeech(f, f.player ? 'it worked on staging!' : 'not my env!');
    }
  },

  update(dt, ctx) {
    const { match } = ctx;
    match.envCooldown = Math.max(0, match.envCooldown - dt);
    const env = match.environment;
    if (!env) return;
    env.t += dt;
    while (env.burns < ENV_BURN_TIMES.length && env.t >= ENV_BURN_TIMES[env.burns]) {
      env.burns++;
      if (match.phase !== 'fight') continue;
      sfx.sizzle();
      shake(0.8);
      for (const f of match.fighters) burn(f, ctx);
      ctx.updateHud();
    }
    if (env.t >= ENV_DURATION) env.el.classList.add('leaving');
    if (env.t >= ENV_DURATION + SPECIAL_FADE) {
      env.el.remove();
      match.environment = null;
      match.envCooldown = ENV_COOLDOWN;
    }
  },

  /** Lava glows under a fighter's feet while they stand in it. */
  onLava: (f, match) => !!match.environment && match.environment.t >= ENV_LAVA_AT && f.y === 0,
};
