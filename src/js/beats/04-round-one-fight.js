import { sfx } from '../audio.js';
import { banner, popText, removeAfter, shake, spawn, sparks } from '../effects.js';
import { setCaption } from '../hud.js';
import { wait } from '../timing.js';

/** [4] The Agile fairy-tale book shatters into "ROUND 1 – FIGHT!". */
export async function roundOneFight() {
  setCaption(4, '…less like a textbook Agile fairy tale, more like a 1v1 match in Mortal Kombat.');
  const book = spawn('big', '📖🦄', 390, 170);
  book.style.fontSize = '90px';
  book.animate([{ transform: 'scale(0)' }, { transform: 'none' }], { duration: 500 });
  await wait(1200);
  book.remove();
  sparks(480, 230, '#fff');
  sparks(480, 230, '#E91E63');
  shake();
  sfx.boom();
  sfx.fight();
  banner('ROUND 1 – FIGHT!', '', 2000);
  for (let i = 0; i < 5; i++) {
    const bolt = spawn('big', '⚡', 80 + i * 190, 150);
    bolt.style.fontSize = '70px';
    removeAfter(bolt, 900);
  }
  await wait(1000);
  popText('3x COMBO!', 380, 300, '#ff0', 28);
}
