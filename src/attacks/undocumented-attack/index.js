import './style.css';
import hairdryerSrc from './hairdryer.svg';
import wheelSrc from './wheel.svg';
import bananaSrc from './banana.svg';
import { GROUND } from '../../js/fight/constants.js';
import { makeEl, rand } from '../../js/fight/util.js';

const RANDOM_STUFF = [
  hairdryerSrc,
  wheelSrc,
  bananaSrc,
  bananaSrc,
  hairdryerSrc,
  wheelSrc,
  bananaSrc,
];

/** "undocumented changes": random, unrelated objects pop up all around Emilia. */
function buildRandomStuff(emi) {
  const cloud = makeEl('div', 'random-stuff', { left: emi.x + 'px', bottom: GROUND + 'px' });
  const start = rand(0, Math.PI * 2);
  RANDOM_STUFF.forEach((src, i) => {
    const angle = start + (i / RANDOM_STUFF.length) * Math.PI * 2;
    const size = rand(40, 58);
    const img = makeEl('img', 'random-item', {
      width: size + 'px',
      height: size + 'px',
      left: Math.cos(angle) * rand(95, 125) - size / 2 + 'px',
      bottom: Math.max(0, 110 + Math.sin(angle) * rand(95, 120) - size / 2) + 'px',
      animationDelay: i * 0.06 + 's, ' + rand(0, 0.6) + 's',
    });
    img.style.setProperty('--rot', rand(-30, 30) + 'deg');
    img.src = src;
    img.alt = '';
    cloud.appendChild(img);
  });
  return cloud;
}

/** Kuba, key 5. Counter: Emilia's `/`. */
export default {
  id: 'undocumented',
  type: 'special',
  owner: 0,
  label: 'undocumented',
  name: 'undocumented changes',
  fx: { color: '#00ffe1', tint: '#007a8a' },
  duration: 2.4,
  hitAt: 0.5,
  follow: true,
  build: buildRandomStuff,
};
