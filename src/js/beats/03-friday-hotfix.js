import { $ } from '../dom.js';
import { sfx } from '../audio.js';
import { banner, flyProjectile, lunge } from '../effects.js';
import { damage, setCaption } from '../hud.js';
import { wait } from '../timing.js';

/** [3] QA kicks a last-minute Friday hotfix (a pebble in the dev's boot). */
export async function fridayHotfix() {
  setCaption(3, '…a Friday afternoon hotfix that feels like a pebble stuck in a Developer’s shoe.');
  const vs = $('#vs');
  vs.classList.add('red');
  $('#vs small').textContent = 'FRIDAY 15:30';
  sfx.lowHealth();
  await wait(700);
  lunge(1);
  sfx.whoosh();
  flyProjectile(
    '🥾<i class="pebble"></i><span>LAST-MINUTE HOTFIX!</span>',
    'boot',
    650,
    260,
    290,
    800,
  );
  await wait(800);
  banner('CRITICAL HIT!<br>CONTEXT SWITCH PENALTY!', 'small', 2200);
  damage(0, 35);
  await wait(2200);
  vs.classList.remove('red');
}
