import './style.css';
import floppySrc from './floppy.png';
import { $ } from '../../js/dom.js';
import { sfx } from '../../js/audio.js';
import { popText, shake, sparks } from '../../js/effects.js';
import { impact, muzzle, slamText } from '../../js/flashy.js';
import {
  COLORS,
  HITSTOP,
  HURTBOX_HALF_WIDTH,
  HURTBOX_HEIGHT,
  STAGE_WIDTH,
  THROW_POSE_TIME,
} from '../../js/fight/constants.js';
import { toStageY } from '../../js/fight/util.js';

const FLOPPY_SIZE = 40;
const FLOPPY_SPEED = 540; // px/s
const FLOPPY_HEIGHT = 120; // launch height above the thrower's feet
const THROW_COOLDOWN = 0.55; // s between throws (and only one floppy in flight)

const overlaps = (floppy, f) =>
  Math.abs(floppy.x - f.x) < HURTBOX_HALF_WIDTH + FLOPPY_SIZE / 2 &&
  floppy.y + FLOPPY_SIZE / 2 > f.y &&
  floppy.y - FLOPPY_SIZE / 2 < f.y + HURTBOX_HEIGHT;

/**
 * Both players, keys 1 / 6: a thrown floppy disk. Blockable: the classic hold block (Z / N, slot 1)
 * takes it with chip damage (see landHit in fight.js). Two floppies meeting mid-air shatter.
 */
export default {
  id: 'throw',
  type: 'projectile',
  owner: null, // both fighters
  label: 'floppy',
  counter: { label: 'floppy (hold)' },

  clear(match) {
    match.floppies?.forEach((p) => p.el.remove());
    match.floppies = [];
  },

  try(f, ctx) {
    const { match } = ctx;
    const inFlight = match.floppies.some((p) => p.owner === f.player);
    if (f.cooldown > 0 || inFlight) return;
    f.throwTimer = THROW_POSE_TIME;
    f.cooldown = THROW_COOLDOWN;
    sfx.whoosh();
    muzzle(f.x + f.dir * 60, toStageY(f.y + FLOPPY_HEIGHT), COLORS[f.player]);

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
      trail: 0,
      el,
    });
  },

  update(dt, ctx) {
    const { match } = ctx;
    for (const p of match.floppies) {
      p.x += p.vx * dt;
      p.spin += dt * 720 * Math.sign(p.vx);
      ctx.leaveTrail(p, dt, COLORS[p.owner], 20);
    }

    // Floppy vs floppy: both shatter.
    const [p0, p1] = [0, 1].map((owner) => match.floppies.find((p) => p.owner === owner));
    if (p0 && p1 && p0.x + FLOPPY_SIZE >= p1.x && Math.abs(p0.y - p1.y) < FLOPPY_SIZE) {
      const x = (p0.x + p1.x) / 2;
      sparks(x, toStageY(p0.y), '#ff0');
      sparks(x, toStageY(p0.y), '#0ff');
      popText('CLASH!', x - 40, toStageY(p0.y) - 40, '#fff', 16);
      impact(x, toStageY(p0.y), '#fff', 1.3);
      impact(x, toStageY(p0.y), '#ffd700', 0.8);
      slamText('CLASH!', x, toStageY(p0.y) - 60, '#fff', 22);
      ctx.freeze(HITSTOP.clash);
      shake(1.5);
      sfx.hit();
      sfx.guard();
      p0.dead = p1.dead = true;
    }

    for (const p of match.floppies) {
      if (p.dead) continue;
      const target = match.fighters[1 - p.owner];
      if (target.health > 0 && overlaps(p, target)) {
        p.dead = true;
        ctx.landHit(match.fighters[p.owner], target, p);
      } else if (p.x < -FLOPPY_SIZE || p.x > STAGE_WIDTH + FLOPPY_SIZE) {
        p.dead = true;
      }
    }

    match.floppies = match.floppies.filter((p) => {
      if (p.dead) p.el.remove();
      return !p.dead;
    });
  },

  render(match) {
    for (const p of match.floppies) {
      p.el.style.left = p.x - FLOPPY_SIZE / 2 + 'px';
      p.el.style.top = toStageY(p.y) - FLOPPY_SIZE / 2 + 'px';
      p.el.style.transform = `rotate(${p.spin}deg)`;
    }
  },
};
