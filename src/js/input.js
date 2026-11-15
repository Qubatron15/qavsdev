import { $ } from './dom.js';
import { state } from './state.js';
import { ensureAudio, toggleMute } from './audio.js';
import { toggleCaseStudy } from './caseStudy.js';
import { resetArena } from './reset.js';
import { BeatCancelled } from './timing.js';
import { beats } from './beats/index.js';

function onKeyDown(event) {
  if (event.key === 'Escape') {
    document.activeElement.blur(); // leave an editable case-study section
    return;
  }
  if (event.target.isContentEditable || event.repeat || event.ctrlKey || event.metaKey) return;

  const key = event.key.toLowerCase();
  ensureAudio(); // first key press unlocks audio
  if (key === 'c') return toggleCaseStudy();
  if (key === 'r') return resetArena();
  if (key === 'm') return toggleMute();
  if (state.caseStudyOpen) return;

  const beat = beats[key];
  if (beat) {
    beat().catch((error) => {
      if (!(error instanceof BeatCancelled)) console.error(error);
    });
  }
}

export function initInput() {
  addEventListener('keydown', onKeyDown);
  $('#sound-toggle').addEventListener('click', toggleMute);
}
