import { $, fxLayer, bossScene, fighter } from './dom.js';
import { state } from './state.js';
import { setHealth, setCaption } from './hud.js';
import { toggleCaseStudy } from './caseStudy.js';

/** Cancel any running beat and put the arena back to its initial state. */
export function resetArena() {
  state.generation++;
  fxLayer.innerHTML = '';
  bossScene.classList.remove('on');
  bossScene.querySelectorAll('.candy').forEach((el) => el.remove());
  $('#boss-bubble').style.display = 'none';
  setHealth(100, 100);
  $('#vs').classList.remove('red');
  $('#vs small').textContent = 'FRI 15:30';
  fighter(0).classList.remove('spotlit');
  fighter(1).classList.remove('spotlit', 'aura');
  if (state.caseStudyOpen) toggleCaseStudy();
  setCaption('READY', 'Arena reset. Press 1–8, 0, C.');
}
