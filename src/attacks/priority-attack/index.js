import './style.css';
import { fighter } from '../../js/dom.js';
import { GROUND } from '../../js/fight/constants.js';
import { makeEl, rand } from '../../js/fight/util.js';

const PRIORITY_LABELS = ['P1', 'P2', 'P3', 'MAJOR', 'URGENT!', 'P2', 'CRITICAL'];

/**
 * "bug priority wars": tasks of every size rain down on Kuba while he ducks left and right,
 * then a giant one flattens him — only his legs and flailing arms stick out.
 */
function buildPriorityWars(kuba) {
  const rain = makeEl('div', 'priority-rain', { left: kuba.x + 'px', bottom: GROUND + 'px' });
  fighter(kuba.player).animate(
    [
      { transform: 'none' },
      { transform: 'translateX(-34px)' },
      { transform: 'translateX(30px)' },
      { transform: 'translateX(-24px)' },
      { transform: 'none' },
    ],
    { duration: 850, easing: 'ease-in-out' },
  );
  PRIORITY_LABELS.forEach((label, i) => {
    const size = rand(38, 96);
    const side = i % 2 ? 1 : -1; // near misses, alternating sides
    const task = makeEl('div', 'priority-task', {
      width: size + 'px',
      height: size * 0.62 + 'px',
      fontSize: Math.max(7, size / 9) + 'px',
      left: side * rand(60, 150) - size / 2 + 'px',
      bottom: '0px',
      animationDelay: i * 0.11 + 's',
    });
    task.style.setProperty('--rot', rand(-14, 14) + 'deg');
    task.textContent = label;
    rain.appendChild(task);
  });
  const giant = makeEl('div', 'priority-giant');
  giant.textContent = 'P0 BLOCKER';
  giant.appendChild(makeEl('div', 'stuck-arm left'));
  giant.appendChild(makeEl('div', 'stuck-arm right'));
  rain.appendChild(giant);
  return rain;
}

/** Emilia, key 9. Counter: Kuba's V. Hits twice as hard. */
export default {
  id: 'priority',
  type: 'special',
  owner: 1,
  label: 'priority',
  name: 'bug priority wars',
  fx: { color: '#ff3030', tint: '#9a0000' },
  duration: 2.8,
  hitAt: 1.15, // when the giant task lands
  follow: true,
  damage: 2,
  build: buildPriorityWars,
};
