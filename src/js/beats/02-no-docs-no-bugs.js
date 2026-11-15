import { sfx } from '../audio.js';
import { banner, flyProjectile, lunge, removeAfter, spawn } from '../effects.js';
import { damage, setCaption } from '../hud.js';
import { wait } from '../timing.js';

/** [2] Dev parries and counters with the "no docs, no bugs" scroll. */
export async function noDocsNoBugs() {
  setCaption(2, '…countered by “No documentation means no bugs!”');
  removeAfter(spawn('shield', 'PARRY!', 95, 200), 1800);
  sfx.zap();
  await wait(500);
  lunge(0);
  sfx.whoosh();
  flyProjectile('📜🔥 404: DOCS NOT FOUND → 0 BUGS!', 'scroll', 300, 640, 320, 700);
  await wait(700);
  banner('CRITICAL HIT!');
  damage(1, 20);
}
