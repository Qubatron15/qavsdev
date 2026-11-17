import { fxLayer, game, fighter } from './dom.js';
import { sfx } from './audio.js';
import { showAttackPose } from './sprites.js';

/** Spawn an absolutely positioned element in the effects layer. */
export function spawn(className, html, x, y) {
  const el = document.createElement('div');
  el.className = className;
  el.innerHTML = html;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  fxLayer.appendChild(el);
  return el;
}

export const removeAfter = (el, ms) => setTimeout(() => el.remove(), ms);

/** Fly a projectile horizontally from fromX to toX at height y. */
export function flyProjectile(html, variant, fromX, toX, y, ms) {
  const el = spawn('projectile ' + variant, html, fromX, y);
  el.animate([{ left: fromX + 'px' }, { left: toX + 'px' }], {
    duration: ms,
    easing: 'ease-in',
    fill: 'forwards',
  });
  removeAfter(el, ms + 150);
  return el;
}

/** Floating text that drifts up and fades out. */
export function popText(text, x, y, color = '#ff0', size = 14) {
  const el = spawn('pop', text, x, y);
  el.style.color = color;
  el.style.fontSize = size + 'px';
  removeAfter(el, 1400);
}

/** Full-width banner. variant: '' | 'small' | 'souls'. */
export function banner(html, variant = '', ms = 1800) {
  const isSouls = variant === 'souls';
  const el = spawn('banner ' + variant, html, 0, isSouls ? 92 : 190);
  el.style.color = isSouls ? '' : '#fff';
  removeAfter(el, ms);
}

export function sparks(x, y, color) {
  for (let i = 0; i < 14; i++) {
    const el = spawn('spark', '', x, y);
    const angle = Math.random() * 6.28;
    const radius = 40 + Math.random() * 60;
    el.style.cssText += `width:8px;height:8px;background:${color}`;
    el.animate(
      [
        { transform: 'none', opacity: 1 },
        {
          transform: `translate(${Math.cos(angle) * radius}px,${Math.sin(angle) * radius}px)`,
          opacity: 0,
        },
      ],
      { duration: 600 },
    );
    removeAfter(el, 600);
  }
}

export function shake() {
  game.animate(
    [
      { transform: 'none' },
      { transform: 'translate(-9px,5px)' },
      { transform: 'translate(8px,-6px)' },
      { transform: 'translate(-5px,3px)' },
      { transform: 'none' },
    ],
    { duration: 350 },
  );
}

/** Fighter steps toward the opponent and back, briefly showing its attack sprite. */
export function lunge(player) {
  showAttackPose(fighter(player), 450);
  fighter(player).animate(
    [
      { transform: 'none' },
      { transform: `translateX(${player ? -50 : 50}px)` },
      { transform: 'none' },
    ],
    { duration: 350 },
  );
}

/** Hit flash on the fighter, plus hit sound and screen shake. */
export function hurt(player) {
  const el = fighter(player);
  el.classList.add('hit');
  setTimeout(() => el.classList.remove('hit'), 400);
  sfx.hit();
  shake();
}
