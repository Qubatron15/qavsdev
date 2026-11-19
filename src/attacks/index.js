import floppy from './floppy-attack/index.js';
import docs from './docs-attack/index.js';
import bugs from './bugs-attack/index.js';
import hotfix from './hotfix-attack/index.js';
import codegen from './codegen-attack/index.js';
import undocumented from './undocumented-attack/index.js';
import acs from './acs-attack/index.js';
import priority from './priority-attack/index.js';
import environment from './environment-attack/index.js';

/*
 * Attack registry. Each attack (and the data for its counter) lives in its own folder with its
 * styles and assets. Keys stay in one place: LAYOUT in src/js/fight.js binds them to these ids.
 *
 * type 'special'    — a scene effect played out by fight.js (trySpecial / updateSpecials):
 *                     owner, name, duration, hitAt, follow?, damage?, build, animate?, hitPoint?
 * type 'volley'     — a swarm of projectiles, see src/js/fight/volley.js
 * type 'projectile' — the floppy disk
 * type 'environment'— the lava, belongs to neither player
 * Stateful attacks (all but specials) implement clear(match), try, update(dt, ctx), render(match).
 */
export const ATTACK_LIST = [floppy, docs, bugs, hotfix, codegen, undocumented, acs, priority];

/** Attack id (the action name in LAYOUT) → attack. */
export const ATTACKS = Object.fromEntries(ATTACK_LIST.map((a) => [a.id, a]));

export const SPECIALS = Object.fromEntries(
  ATTACK_LIST.filter((a) => a.type === 'special').map((a) => [a.id, a]),
);

/** Attacks with their own state and update loop, in update order (specials run after these). */
export const PROJECTILES = [floppy, bugs, docs];

export { environment };
