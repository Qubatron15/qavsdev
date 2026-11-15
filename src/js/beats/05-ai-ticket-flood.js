import { sfx } from '../audio.js';
import { flyProjectile, popText, spawn } from '../effects.js';
import { damage, setCaption } from '../hud.js';
import { wait } from '../timing.js';

/** [5] An AI bot spams approved PRs; QA is buried under a pile of Jira tickets. */
export async function aiTicketFlood() {
  setCaption(
    5,
    'AI generates code & reviews PRs at record speed: QA gets buried under 5x more tickets.',
  );
  const robot = spawn('big', '🤖', 190, 95);
  robot.style.fontSize = '60px';

  for (let i = 0; i < 8; i++) {
    sfx.zap();
    flyProjectile('AI PR APPROVED!', 'ai-pr', 260, 720, 150 + (i % 4) * 24, 500);
    await wait(170);
  }

  for (let i = 0; i < 5; i++) {
    const ticket = spawn('ticket', '5x JIRA-' + (4101 + i * 7), 640 + i * 20, -40);
    ticket.animate([{ top: '-40px' }, { top: 250 + i * 8 + 'px' }], {
      duration: 700,
      fill: 'forwards',
      easing: 'ease-in',
    });
    await wait(250);
  }

  const pile = spawn('ticket-pile', '', 690, 0);
  pile.style.top = 'auto';
  pile.style.bottom = '25px';
  pile.animate([{ height: '0px' }, { height: '200px' }], { duration: 800, fill: 'forwards' });
  await wait(800);
  popText('OVERWHELMED!', 690, 200, '#f66', 16);
  damage(1, 30);
  robot.remove();
}
