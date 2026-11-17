import './styles/base.css';
import './styles/scene.css';
import './styles/hud.css';
import './styles/effects.css';
import './styles/boss.css';
import './styles/case-study.css';

import jakubSprite from './assets/sprites/jakub.png';
import emiliaSprite from './assets/sprites/emi_stand.png';
import emiliaAttackSprite from './assets/sprites/emi_throw.png';

import { initStageScaling } from './js/stage.js';
import { createBossSprite, loadFighterSprite } from './js/sprites.js';
import { initInput } from './js/input.js';
import { resetArena } from './js/reset.js';

initStageScaling();
createBossSprite();
loadFighterSprite(jakubSprite, '#fighter-dev', 1.3, '#portrait-dev');
loadFighterSprite(emiliaSprite, '#fighter-qa', 0.4, '#portrait-qa', emiliaAttackSprite);
initInput();
resetArena();
