import { stage } from './dom.js';

export const STAGE_WIDTH = 960;
export const STAGE_HEIGHT = 540;

/** Scale the fixed-size stage so it fits the window. */
export function fitStage() {
  const scale = Math.min(innerWidth / STAGE_WIDTH, innerHeight / STAGE_HEIGHT);
  stage.style.transform = `scale(${scale})`;
}

export function initStageScaling() {
  addEventListener('resize', fitStage);
  fitStage();
}
