import { $ } from './dom.js';
import { state } from './state.js';
import { ensureAudio, toggleMute } from './audio.js';
// Case study slide: disabled
// import { toggleCaseStudy } from './caseStudy.js';
import { resetArena } from './reset.js';
// Story beats: disabled
// import { BeatCancelled } from './timing.js';
// import { beats } from './beats/index.js';
import { handleFightKey, releaseAllKeys, renderControls, startMatch } from './fight.js';

function onKeyDown(event) {
  if (event.key === 'Escape') {
    document.activeElement.blur(); // leave an editable case-study section
    return;
  }
  if (event.target.isContentEditable || event.ctrlKey || event.metaKey) return;

  ensureAudio(); // first key press unlocks audio
  if (!state.caseStudyOpen && handleFightKey(event, true)) {
    event.preventDefault(); // e.g. `/` must not open Firefox's quick find
    return;
  }
  if (event.repeat) return;

  // Both hands' zones are taken by the fight keymap, so reset / mute sit outside them.
  // const key = event.key.toLowerCase();
  // if (key === 'c') return toggleCaseStudy(); // Case study slide: disabled
  if (event.code === 'Backspace') {
    event.preventDefault();
    return resetArena();
  }
  if (event.code === 'Equal') return toggleMute();
  if (state.caseStudyOpen) return;
  if (event.code === 'Space') {
    event.preventDefault();
    return startMatch();
  }

  // Story beats (keys 1-8): disabled
  // const beat = beats[key];
  // if (beat) {
  //   beat().catch((error) => {
  //     if (!(error instanceof BeatCancelled)) console.error(error);
  //   });
  // }
}

export function initInput() {
  renderControls();
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', (event) => handleFightKey(event, false));
  addEventListener('blur', releaseAllKeys);
  $('#sound-toggle').addEventListener('click', toggleMute);
}
