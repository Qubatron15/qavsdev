import { $, game } from './dom.js';
import { state } from './state.js';
import { sfx } from './audio.js';

/** Flip between the arena and the editable case-study slide. */
export function toggleCaseStudy() {
  state.caseStudyOpen = !state.caseStudyOpen;
  $('#case').classList.toggle('on', state.caseStudyOpen);
  game.classList.toggle('off', state.caseStudyOpen);
  if (state.caseStudyOpen) sfx.fight();
}
