import { $, fxLayer, fighter } from './dom.js';
// import { bossScene } from './dom.js'; // DevOps boss: disabled
import { state } from './state.js';
import { setHealth, setCaption } from './hud.js';
// import { toggleCaseStudy } from './caseStudy.js'; // Case study slide: disabled
import { CONTROLS_HELP, resetFight } from './fight.js';

/** Cancel any running beat and put the arena back to its initial state. */
export function resetArena() {
  state.generation++;
  fxLayer.innerHTML = '';
  // DevOps boss: disabled
  // bossScene.classList.remove('on');
  // bossScene.querySelectorAll('.candy').forEach((el) => el.remove());
  // $('#boss-bubble').style.display = 'none';
  setHealth(100, 100);
  $('#vs').classList.remove('red');
  resetFight();
  fighter(0).classList.remove('spotlit');
  fighter(1).classList.remove('spotlit', 'aura');
  // if (state.caseStudyOpen) toggleCaseStudy(); // Case study slide: disabled
  setCaption('PRESS SPACE', CONTROLS_HELP);
}
