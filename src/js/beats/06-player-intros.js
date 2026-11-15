import { fighter } from '../dom.js';
import { sfx } from '../audio.js';
import { popText, spawn } from '../effects.js';
import { setCaption } from '../hud.js';
import { wait } from '../timing.js';

/** [6] Spotlight introduces each player in turn. */
export async function playerIntros() {
  setCaption(
    6,
    'A Full-Stack Developer (keyboard) and a Senior QA Engineer (controller) step into the arena…',
  );
  const spotlight = spawn('spotlight', '', 0, 0);
  spotlight.style.cssText += 'width:960px;height:540px;z-index:4';
  const aimAt = (x) =>
    (spotlight.style.background = `radial-gradient(circle at ${x}px 360px,#0000 0 130px,#000c 270px)`);

  aimAt(218);
  sfx.fight();
  fighter(0).classList.add('spotlit');
  popText('\\m/', 200, 230, '#fff', 34);
  popText('P1: JAKUB · KEYBOARD', 110, 175, '#0ff', 12);
  await wait(1700);

  aimAt(776);
  fighter(0).classList.remove('spotlit');
  fighter(1).classList.add('spotlit', 'aura');
  popText('PLAYWRIGHT ROCKERS', 600, 175, '#f6a', 12);
  await wait(1800);

  spotlight.remove();
  fighter(1).classList.remove('spotlit', 'aura');
}
