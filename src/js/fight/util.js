import { GROUND } from './constants.js';

/** Stage-pixel position of a point `height` px above the ground. */
export const toStageY = (height) => 540 - GROUND - height;

export const rand = (min, max) => min + Math.random() * (max - min);
export const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function makeEl(tag, className, styles = {}) {
  const el = document.createElement(tag);
  el.className = className;
  Object.assign(el.style, styles);
  return el;
}
