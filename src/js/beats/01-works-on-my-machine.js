import { sfx } from '../audio.js';
import { flyProjectile, lunge, sparks } from '../effects.js';
import { damage, setCaption } from '../hud.js';
import { wait } from '../timing.js';

/** [1] Both fighters fire their catchphrases; they collide mid-arena. */
export async function worksOnMyMachine() {
  setCaption(1, '“Works on my machine!” vs. “Cannot reproduce!”');
  sfx.whoosh();
  lunge(0);
  lunge(1);
  flyProjectile('WORKS ON MY MACHINE!', 'fireball', 300, 430, 320, 800);
  flyProjectile('CANNOT REPRODUCE!', 'slash', 640, 440, 320, 800);
  await wait(800);
  sparks(480, 335, '#ff0');
  sparks(480, 335, '#0ff');
  damage(0, 10);
  damage(1, 10);
}
