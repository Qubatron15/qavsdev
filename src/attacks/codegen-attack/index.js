import './style.css';
import { GROUND } from '../../js/fight/constants.js';
import { makeEl, pick, rand } from '../../js/fight/util.js';

const TASK_PILE_HEIGHT = 160; // px: buries Emilia up to the neck
const TASK_ROW_HEIGHT = 22;
const TASK_LABELS = ['TEST #', 'AI PR #', 'VERIFY #', 'REGRESS #'];

/** "AI code-gen": a pile of tasks to test rains down on Emilia until only her head sticks out. */
function buildTaskPile(emi) {
  const pile = makeEl('div', 'task-pile', { left: emi.x + 'px', bottom: GROUND + 'px' });
  const rows = Math.floor(TASK_PILE_HEIGHT / TASK_ROW_HEIGHT);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 2; col++) {
      const task = makeEl('div', 'task', {
        left: -86 + col * 86 + rand(-6, 6) + 'px',
        bottom: row * TASK_ROW_HEIGHT + 'px',
        animationDelay: (row * 2 + col) * 0.045 + 's',
      });
      task.style.setProperty('--rot', rand(-9, 9) + 'deg');
      task.textContent = pick(TASK_LABELS) + Math.floor(rand(100, 1000));
      pile.appendChild(task);
    }
  }
  return pile;
}

/** Kuba, key 4. Counter: Emilia's `.`. */
export default {
  id: 'codegen',
  type: 'special',
  owner: 0,
  label: 'AI code-gen',
  name: 'AI code-gen',
  fx: { color: '#39ff8a', tint: '#008a3a' },
  duration: 2.6,
  hitAt: 0.9,
  follow: true,
  build: buildTaskPile,
};
