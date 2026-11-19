import './style.css';
import bugSrc from './bug.png';
import { createVolleyAttack } from '../../js/fight/volley.js';

/**
 * Emilia, key 7: bug swarm — a series of bugs scuttles at Kuba.
 * Counter: Kuba's X.
 */
export default createVolleyAttack({
  id: 'bugs',
  owner: 1,
  label: 'bug swarm',
  fx: { color: '#ff3fa4', tint: '#b0006a' },
  flashName: 'bug swarm',
  src: bugSrc,
  className: 'bug',
  width: 86,
  height: 64,
  trailSize: 24,
  counter: { quips: ['works on my machine', 'cannot reproduce'] },
  pose(el, bug, i, clock) {
    const bob = Math.sin(clock * 14 + i) * 6;
    const face = bug.vx < 0 ? 1 : -1;
    el.style.transform = `scaleX(${face}) translateY(${bob}px)`;
  },
});
