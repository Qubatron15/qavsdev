import './style.css';
import { makeEl, rand, toStageY } from '../../js/fight/util.js';

const FLOOR_TOP = 470; // stage y where the front strip of floor starts (just below the feet line)
const FLOOR_CELL = 60; // px, width of one floor tile that can fall away
const FLOOR_HOLES = 5; // tiles of Kuba's floor that vanish
const AC_QUESTIONS = ['GIVEN ???', 'WHEN ???', 'THEN ???']; // orbit Kuba
const AC_ORBIT = { rx: 125, ry: 38, height: 130, speed: 3.2 }; // px, px, px above feet, rad/s
const AC_HIT_TIMES = [0.45, 1.05, 1.65]; // s: each question hits Kuba once, in turn

/**
 * "missing ACs": tiles of Kuba's floor crumble and fall away, leaving holes into the void,
 * while the unanswered Given / When / Then questions circle around him (see orbitAcQuestions).
 */
function buildMissingAcs() {
  const root = makeEl('div', 'missing-acs');
  const floor = makeEl('div', 'floor-holes', { top: FLOOR_TOP + 'px' });
  root.appendChild(floor);
  const cells = Array.from({ length: Math.floor(480 / FLOOR_CELL) }, (_, i) => i);
  // Pick random tiles (Fisher–Yates), then drop them one after another.
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  cells.slice(0, FLOOR_HOLES).forEach((cell, i) => {
    const delay = i * 0.08 + 's';
    const left = cell * FLOOR_CELL + 'px';
    floor.appendChild(makeEl('div', 'floor-gap', { left, animationDelay: delay }));
    const chunk = makeEl('div', 'floor-chunk', { left, animationDelay: delay });
    chunk.style.setProperty('--rot', rand(-40, 40) + 'deg');
    floor.appendChild(chunk);
  });
  for (const question of AC_QUESTIONS) {
    const el = makeEl('div', 'ac-question');
    el.textContent = question;
    root.appendChild(el);
  }
  return root;
}

const acAngle = (t, i) => t * AC_ORBIT.speed + (i / AC_QUESTIONS.length) * Math.PI * 2;

/** Question `i` strikes Kuba: it flashes, and the hit sparks fly from where it is on the orbit. */
function acQuestionHit(el, kuba, t, i) {
  const q = el.querySelectorAll('.ac-question')[i];
  q.classList.remove('strike');
  void q.offsetWidth; // restart the flash
  q.classList.add('strike');
  return { x: kuba.x + Math.cos(acAngle(t, i)) * AC_ORBIT.rx, y: kuba.y + AC_ORBIT.height };
}

/** Per-frame: spread the questions evenly on an ellipse around Kuba; the near side is bigger. */
function orbitAcQuestions(el, kuba, t) {
  el.querySelectorAll('.ac-question').forEach((q, i) => {
    const angle = acAngle(t, i);
    const depth = Math.sin(angle); // 1 = in front of Kuba, -1 = behind
    q.style.left = kuba.x + Math.cos(angle) * AC_ORBIT.rx + 'px';
    q.style.top = toStageY(kuba.y + AC_ORBIT.height) + depth * AC_ORBIT.ry + 'px';
    q.style.transform = `translate(-50%, -50%) scale(${0.85 + 0.2 * depth})`;
    q.style.opacity = 0.65 + 0.35 * depth;
  });
}

/** Emilia, key 8. Counter: Kuba's C. */
export default {
  id: 'acs',
  type: 'special',
  owner: 1,
  label: 'missing ACs',
  name: 'missing ACs',
  fx: { color: '#ffd700', tint: '#8a5a00' },
  duration: 2.4,
  hitAt: AC_HIT_TIMES,
  build: buildMissingAcs,
  animate: orbitAcQuestions,
  hitPoint: acQuestionHit,
};
