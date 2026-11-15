import { state } from '../state.js';
import { sfx } from '../audio.js';
import { banner, flyProjectile, popText, removeAfter, shake, spawn, sparks } from '../effects.js';
import { setCaption, setHealth } from '../hud.js';
import { wait } from '../timing.js';

const UNLOCKS = ['ROLE SHADOWING UNLOCKED', 'PRE-QA DESK CHECK', 'TYPESCRIPT + PLAYWRIGHT SYNERGY'];

/** [8] Both shield up against the chaos, heal to full and unlock better practices. */
export async function stageCleared() {
  setCaption(
    8,
    'Parry the daily chaos: role shadowing, smarter bug communication, TypeScript + Playwright workflows.',
  );
  const devShield = spawn('shield', '', 95, 200);
  devShield.style.cssText += ';animation:blink .6s steps(2) 3';
  removeAfter(devShield, 2000);
  removeAfter(spawn('shield cyan', '', 660, 215), 2000);

  flyProjectile('💥 CHAOS', 'scroll', 470, 330, 320, 500);
  flyProjectile('💥 CHAOS', 'slash', 480, 640, 320, 500);
  await wait(520);
  sparks(330, 330, '#ff0');
  sparks(660, 330, '#0ff');
  sfx.hit();
  shake();
  await wait(300);

  sfx.heal();
  setHealth(100, 100);
  for (let i = 0; i < 8; i++) popText('❤', 150 + (i % 4) * 40 + (i > 3 ? 500 : 0), 260, '#f4a', 24);

  const generation = state.generation;
  UNLOCKS.forEach((text, i) => {
    setTimeout(() => {
      if (generation !== state.generation) return; // arena was reset
      removeAfter(spawn('unlock-badge', `[${text}]`, 250, 130 + i * 42), 3500);
      sfx.zap();
    }, i * 700);
  });

  await wait(2200);
  banner('STAGE CLEARED!<br>RELEASE READY!', '', 2400);
  sfx.fight();
}
