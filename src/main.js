import './styles/base.css';
import './styles/scene.css';
import './styles/hud.css';
import './styles/effects.css';
// import './styles/boss.css'; // DevOps boss: disabled
import './styles/case-study.css';

import kubaStand from './assets/sprites/kuba_stand.png';
import kubaThrow from './assets/sprites/kuba_throw.png';
import kubaBlock from './assets/sprites/kuba_block.png';
import kubaHit from './assets/sprites/kuba_hit.png';
import kubaJump from './assets/sprites/kuba_jump.png';
import emiStand from './assets/sprites/emi_stand.png';
import emiThrow from './assets/sprites/emi_throw.png';
import emiBlock from './assets/sprites/emi_block.png';
import emiHit from './assets/sprites/emi_hit.png';
import emiJump from './assets/sprites/emi_jump.png';

import { initStageScaling } from './js/stage.js';
import { loadFighter } from './js/sprites.js';
// import { createBossSprite } from './js/sprites.js'; // DevOps boss: disabled
import { initInput } from './js/input.js';
import { resetArena } from './js/reset.js';

initStageScaling();
// createBossSprite(); // DevOps boss: disabled
loadFighter(
  0,
  { stand: kubaStand, throw: kubaThrow, block: kubaBlock, hit: kubaHit, jump: kubaJump },
  '#portrait-dev',
);
loadFighter(
  1,
  { stand: emiStand, throw: emiThrow, block: emiBlock, hit: emiHit, jump: emiJump },
  '#portrait-qa',
);
initInput();
resetArena();
