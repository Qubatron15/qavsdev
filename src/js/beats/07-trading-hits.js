import { state } from '../state.js';
import { sfx } from '../audio.js';
import { banner, flyProjectile, hurt, lunge, popText, sparks } from '../effects.js';
import { setCaption, setHealth } from '../hud.js';
import { wait } from '../timing.js';

const ATTACKS = ['STEALTH PATCH!', 'MISSING AC!', 'TEST ENV IS DOWN!', 'BLOCKER vs. TRIVIAL!'];
/** Both players' health is capped at these values after each exchange. */
const HEALTH_AFTER = [85, 60, 35, 15];

/** [7] Four alternating hits leave both fighters at 15%. */
export async function tradingHits() {
  setCaption(
    7,
    'We’ll trade hits over undocumented changes, missing ACs, flaky environments, and bug priority wars.',
  );
  for (let i = 0; i < ATTACKS.length; i++) {
    const attacker = i % 2;
    lunge(attacker);
    sfx.whoosh();
    popText(ATTACKS[i], attacker ? 560 : 110, 190, '#ff0', 16);
    flyProjectile('💥', '', attacker ? 640 : 300, attacker ? 300 : 640, 320, 300);
    await wait(320);
    sparks(attacker ? 300 : 640, 340, '#f80');
    hurt(1 - attacker);
    setHealth(
      Math.min(state.health[0], HEALTH_AFTER[i]),
      Math.min(state.health[1], HEALTH_AFTER[i]),
    );
    await wait(150);
  }
  banner('DANGER! 15% HP', 'small');
  sfx.lowHealth();
  setTimeout(sfx.lowHealth, 300);
}
