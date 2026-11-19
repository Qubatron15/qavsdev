import './style.css';
import { makeEl, rand } from '../../js/fight/util.js';

/** "friday afternoon hotfix": night falls over the QA half — dark sky, moon, twinkling stars. */
function buildNightSky() {
  const sky = makeEl('div', 'night-sky');
  sky.appendChild(makeEl('div', 'moon'));
  const clock = makeEl('div', 'night-clock');
  clock.textContent = 'FRI 17:59 · DEPLOYED';
  sky.appendChild(clock);
  for (let i = 0; i < 34; i++) {
    const size = Math.round(rand(2, 5)) + 'px';
    sky.appendChild(
      makeEl('span', 'star', {
        left: rand(4, 470) + 'px',
        top: rand(4, 320) + 'px',
        width: size,
        height: size,
        animationDelay: rand(0, 1.2) + 's',
      }),
    );
  }
  return sky;
}

/** Kuba, key 3. Counter: Emilia's `,`. */
export default {
  id: 'hotfix',
  type: 'special',
  owner: 0,
  label: 'fri hotfix',
  name: 'friday afternoon hotfix',
  fx: { color: '#8c7bff', tint: '#2a0aa0' },
  duration: 2.6,
  hitAt: 0.45,
  build: buildNightSky,
};
