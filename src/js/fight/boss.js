import '../../styles/bug-boss.css';
import bugBossSrc from '../../assets/sprites/bug_boss.png';
import { $ } from '../dom.js';
import { GROUND } from './constants.js';

/*
 * Co-op boss mode (key T): a giant bug sits in the middle of the arena and both players attack
 * it. Every attack that would hit the opponent hits the boss instead; each hit takes a little of
 * its health. The boss is a passive target: it doesn't fight back.
 */

export const BOSS_MAX_HEALTH = 500; // a floppy takes 8–12, so each hit is a sliver of the bar
export const BOSS_TIME = 90; // s to squash it before it ships to production
export const BOSS_X = 480; // centre of the stage
const BOSS_WIDTH = 300; // px, sprite width on the stage (578 × 432 source)
const BOSS_HALF_WIDTH = 110; // hurtbox half width (the legs stick out further)
const BOSS_HEIGHT = 190; // hurtbox height above the ground
/** Fighters keep this far from the boss's centre, one on each side. */
export const BOSS_GAP = BOSS_HALF_WIDTH + 40;
export const BOSS_DANGER = 25; // % of health: the boss gets angry
export const BOSS_COLOR = '#ff3b1f';

let el = null;

/** The boss element in the world layer, created on first use. */
function bossEl() {
  if (!el) {
    el = document.createElement('div');
    el.id = 'bug-boss';
    el.style.left = BOSS_X + 'px';
    el.style.bottom = GROUND + 'px';
    el.style.width = BOSS_WIDTH + 'px';
    el.style.marginLeft = -BOSS_WIDTH / 2 + 'px';
    const img = document.createElement('img');
    img.src = bugBossSrc;
    img.alt = '';
    el.appendChild(img);
    $('#fx').before(el);
  }
  return el;
}

/**
 * Fresh boss state. It doubles as the attack target: it has what floppies, swarms and specials
 * read from a defender (x, y, health, guard, hurtbox), plus `isBoss` so landHit can tell.
 */
export function newBoss() {
  return {
    isBoss: true,
    x: BOSS_X,
    y: 0,
    dir: 0,
    health: BOSS_MAX_HEALTH,
    guard: null,
    halfWidth: BOSS_HALF_WIDTH,
    height: BOSS_HEIGHT,
    el: bossEl(),
    hitsBy: [0, 0], // hits landed per player, for the result screen
  };
}

const percent = (boss) => Math.ceil((boss.health / BOSS_MAX_HEALTH) * 100);

/** Show or hide the boss and its health bar, and refresh both. `boss` is null outside boss mode. */
export function renderBoss(boss) {
  const on = !!boss;
  bossEl().classList.toggle('on', on);
  $('#boss-hud').classList.toggle('on', on);
  $('#game').classList.toggle('boss-mode', on);
  if (!boss) {
    bossEl().classList.remove('hit', 'angry', 'defeated', 'escaped');
    return;
  }
  const value = percent(boss);
  $('#boss-health-fill').style.width = value + '%';
  $('#boss-health-ghost').style.width = value + '%';
  $('#boss-health-label').textContent = value + '%';
  const angry = boss.health > 0 && value <= BOSS_DANGER;
  bossEl().classList.toggle('angry', angry);
  $('#boss-hud').classList.toggle('danger', angry);
}

/** Restart the boss's hit flash. */
export function flashBoss() {
  const node = bossEl();
  node.classList.remove('hit');
  void node.offsetWidth;
  node.classList.add('hit');
  setTimeout(() => node.classList.remove('hit'), 300);
}

/** End of the fight: 'defeated' (squashed) or 'escaped' (time ran out). */
export const setBossOutcome = (outcome) => bossEl().classList.add(outcome);
