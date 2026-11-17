import { $ } from './dom.js';
import { state } from './state.js';
import { ensureAudio, toggleMute } from './audio.js';
import { toggleCaseStudy } from './caseStudy.js';
import { resetArena } from './reset.js';
import { BeatCancelled } from './timing.js';
import { beats } from './beats/index.js';
import { handleFightKey, releaseAllKeys, startMatch } from './fight.js';

function onKeyDown(event) {
  if (event.key === 'Escape') {
    document.activeElement.blur(); // leave an editable case-study section
    return;
  }
  if (event.target.isContentEditable || event.ctrlKey || event.metaKey) return;

  ensureAudio(); // first key press unlocks audio
  if (!state.caseStudyOpen && handleFightKey(event, true)) {
    event.preventDefault(); // arrows / Enter must not scroll or click
    return;
  }
  if (event.repeat) return;

  const key = event.key.toLowerCase();
  if (key === 'c') return toggleCaseStudy();
  if (key === 'r') return resetArena();
  if (key === 'm') return toggleMute();
  if (state.caseStudyOpen) return;
  if (event.code === 'Space') {
    event.preventDefault();
    return startMatch();
  }

  const beat = beats[key];
  if (beat) {
    beat().catch((error) => {
      if (!(error instanceof BeatCancelled)) console.error(error);
    });
  }
}

export function initInput() {
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', (event) => handleFightKey(event, false));
  addEventListener('blur', releaseAllKeys);
  $('#sound-toggle').addEventListener('click', toggleMute);
}
