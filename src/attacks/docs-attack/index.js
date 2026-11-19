import './style.css';
import noDocsSrc from './no-docs.svg';
import { createVolleyAttack } from '../../js/fight/volley.js';

/**
 * Kuba, key 2: "no docs, no bugs" — a series of crossed-out documents flies at Emilia.
 * Counter: Emilia's M.
 */
export default createVolleyAttack({
  id: 'docs',
  owner: 0,
  label: 'no docs',
  fx: { color: '#00e5ff', tint: '#0050ff' },
  flashName: 'no docs, no bugs',
  quip: 'no documentation means no bugs',
  src: noDocsSrc,
  className: 'doc',
  width: 56,
  height: 56,
  trailSize: 22,
  counter: { quips: ['no docs, no sign-off', 'I wrote them myself'] },
  pose(el, doc, i, clock) {
    const wobble = Math.sin(clock * 12 + i) * 12;
    el.style.transform = `rotate(${wobble}deg)`;
  },
});
