import { worksOnMyMachine } from './01-works-on-my-machine.js';
import { noDocsNoBugs } from './02-no-docs-no-bugs.js';
import { fridayHotfix } from './03-friday-hotfix.js';
import { roundOneFight } from './04-round-one-fight.js';
import { aiTicketFlood } from './05-ai-ticket-flood.js';
import { playerIntros } from './06-player-intros.js';
import { tradingHits } from './07-trading-hits.js';
import { stageCleared } from './08-stage-cleared.js';
// import { devopsBoss } from './00-devops-boss.js'; // DevOps boss: disabled

/** Keyboard key → story beat. Each beat is an async function cancelled by reset. */
export const beats = {
  1: worksOnMyMachine,
  2: noDocsNoBugs,
  3: fridayHotfix,
  4: roundOneFight,
  5: aiTicketFlood,
  6: playerIntros,
  7: tradingHits,
  8: stageCleared,
  // 0: devopsBoss, // DevOps boss: disabled
};
