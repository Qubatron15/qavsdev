import { FIGHTER_HEIGHT } from '../sprites.js';

/* Fight constants shared by the core (fight.js) and the attack modules (src/attacks). */

export const MAX_HEALTH = 100;
export const DANGER_HEALTH = 25;

export const STAGE_WIDTH = 960;
export const GROUND = 76; // fighters' feet, px above the stage bottom

export const HURTBOX_HALF_WIDTH = 38;
export const HURTBOX_HEIGHT = FIGHTER_HEIGHT - 20;

export const THROW_POSE_TIME = 0.3; // s
export const SWARM_COOLDOWN = 1.8; // s after a swarm or special before the next one (per fighter)
export const SPECIAL_FADE = 0.35; // s a scene effect takes to fade out (matches .special.leaving)

export const COLORS = ['#0ff', '#f6a'];

/** Hitstop (s of frozen fight) per kind of impact. */
export const HITSTOP = { hit: 0.07, crit: 0.15, heavy: 0.12, block: 0.04, guard: 0.09, clash: 0.1 };
