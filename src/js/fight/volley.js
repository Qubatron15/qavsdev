import { $ } from '../dom.js';
import { sfx } from '../audio.js';
import { sparks } from '../effects.js';
import { guardFlash, impact, slamText } from '../flashy.js';
import { COLORS, HITSTOP, STAGE_WIDTH, SWARM_COOLDOWN, THROW_POSE_TIME } from './constants.js';
import { pick, toStageY } from './util.js';

/*
 * Swarm attacks ("volleys"): after a wind-up the attacker releases a series of projectiles at the
 * opponent. The first one to arrive lands the hit (unblockable), unless the defender holds the
 * matching counter — then it pops harmlessly and the defender answers with a quip.
 */
export const VOLLEY_COUNT = 5;
export const VOLLEY_INTERVAL = 0.1; // s between projectiles in the series
export const VOLLEY_WINDUP = 0.3; // s of throw pose before the first one leaves
export const VOLLEY_SPEED = 560; // px/s
export const VOLLEY_LANES = [70, 130, 190, 100, 160]; // height above the ground

/** How long the background stays dimmed for a swarm (ms of real time, before the freeze). */
const SWARM_MS = (VOLLEY_WINDUP + VOLLEY_INTERVAL * (VOLLEY_COUNT - 1) + 0.9) * 1000;

/**
 * Build a volley attack from its config:
 * id, owner, label, fx, flashName, quip (said on launch, optional), src, className, width, height,
 * trailSize, counter: { quips } (said when countered), pose(el, projectile, index, clock).
 */
export function createVolleyAttack(config) {
  const { id, owner, src, className, width, height, trailSize, pose } = config;
  const stateOf = (match) => match.volleys[id];

  function spawn(match, index) {
    const attacker = match.fighters[owner];
    const el = document.createElement('img');
    el.src = src;
    el.className = className;
    el.alt = '';
    el.style.width = width + 'px';
    el.style.height = height + 'px';
    $('#fx').appendChild(el);
    stateOf(match).items.push({
      x: attacker.x + attacker.dir * 36,
      y: VOLLEY_LANES[index % VOLLEY_LANES.length],
      vx: attacker.dir * VOLLEY_SPEED,
      el,
    });
  }

  /** A projectile reaches a defender whose counter is up; the first one resolves the swarm. */
  function countered(defender, projectile, volley, ctx) {
    sparks(projectile.x, toStageY(projectile.y), '#ffd700');
    guardFlash(projectile.x, toStageY(projectile.y), '#ffd700', defender.dir);
    sfx.zap();
    if (volley && !volley.resolved) {
      volley.resolved = true;
      sfx.guard();
      ctx.freeze(HITSTOP.guard);
      sparks(defender.x, toStageY(defender.y + 120), '#ffd700');
      slamText('PERFECT GUARD!', defender.x, toStageY(projectile.y) - 70, '#ffd700', 15);
      ctx.showSpeech(defender, pick(config.counter.quips));
    }
  }

  return {
    ...config,
    type: 'volley',

    clear(match) {
      match.volleys ??= {};
      stateOf(match)?.items.forEach((p) => p.el.remove());
      match.volleys[id] = { items: [], volley: null };
    },

    isIncoming(match) {
      const { volley } = stateOf(match);
      return !!volley && !volley.resolved;
    },

    try(f, ctx) {
      const state = stateOf(ctx.match);
      if (f.player !== owner || f.swarmCooldown > 0 || state.volley) return;
      f.throwTimer = VOLLEY_WINDUP + VOLLEY_INTERVAL * (VOLLEY_COUNT - 1) + THROW_POSE_TIME;
      f.swarmCooldown = SWARM_COOLDOWN;
      sfx.whoosh();
      if (config.quip) ctx.showSpeech(f, config.quip);
      ctx.flashFor(f, id, config.flashName, SWARM_MS);
      state.volley = { spawnsLeft: VOLLEY_COUNT, timer: VOLLEY_WINDUP, resolved: false };
    },

    update(dt, ctx) {
      const { match } = ctx;
      const state = stateOf(match);
      const { volley } = state;
      // Keep releasing the rest of the series after the hit, so a close swarm still reads as five.
      if (volley && volley.spawnsLeft > 0) {
        volley.timer -= dt;
        while (volley.spawnsLeft > 0 && volley.timer <= 0) {
          spawn(match, VOLLEY_COUNT - volley.spawnsLeft);
          volley.spawnsLeft--;
          volley.timer += VOLLEY_INTERVAL;
        }
      }

      const target = ctx.targetOf(owner);
      const front = target.halfWidth ?? 0; // the co-op boss is hit at its edge, not its centre
      for (const p of state.items) {
        p.x += p.vx * dt;
        ctx.leaveTrail(p, dt, config.fx.color, trailSize);
        const reached = p.vx < 0 ? p.x <= target.x + front : p.x >= target.x - front;
        const offscreen = p.x < -width || p.x > STAGE_WIDTH + width;
        if (!reached && !offscreen) continue;
        p.dead = true;
        if (!reached || target.health === 0) continue;
        if (target.guard === id) {
          countered(target, p, volley, ctx);
        } else if (volley && !volley.resolved) {
          volley.resolved = true;
          ctx.landHit(match.fighters[owner], target, p, { unblockable: true });
        } else {
          sparks(p.x, toStageY(p.y), COLORS[owner]);
          impact(p.x, toStageY(p.y), COLORS[owner], 0.5);
        }
      }

      state.items = state.items.filter((p) => {
        if (p.dead) p.el.remove();
        return !p.dead;
      });

      if (volley && volley.spawnsLeft === 0 && state.items.length === 0) state.volley = null;
    },

    render(match) {
      stateOf(match).items.forEach((p, i) => {
        p.el.style.left = p.x - width / 2 + 'px';
        p.el.style.top = toStageY(p.y) - height / 2 + 'px';
        pose(p.el, p, i, match.clock);
      });
    },
  };
}
