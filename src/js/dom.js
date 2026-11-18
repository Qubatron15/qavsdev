export const $ = (selector) => document.querySelector(selector);

export const stage = $('#stage');
export const game = $('#game');
export const fxLayer = $('#fx');
export const fxTop = $('#fx-top');
export const world = $('#world');
// export const bossScene = $('#boss'); // DevOps boss: disabled

/** Fighter containers by player index: 0 = dev, 1 = QA. */
export const fighter = (player) => $(player ? '#fighter-qa' : '#fighter-dev');
