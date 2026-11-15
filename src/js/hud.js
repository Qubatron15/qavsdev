import { $ } from './dom.js';
import { state } from './state.js';
import { sfx } from './audio.js';
import { hurt, popText } from './effects.js';

const DANGER_THRESHOLD = 25;
const MIN_HEALTH = 5;

function fillColor(value, player) {
  if (value > 50) {
    return player ? 'linear-gradient(90deg,#b040ff,#ff3fa4)' : 'linear-gradient(#8aff55,#2bb51f)';
  }
  return value > DANGER_THRESHOLD ? '#ffd600' : '#ff2a2a';
}

/** Set both health bars (percent). */
export function setHealth(dev, qa) {
  state.health = [dev, qa];
  state.health.forEach((value, player) => {
    const fill = $('#health-fill-' + player);
    fill.style.width = value + '%';
    fill.style.background = fillColor(value, player);
    $('#health-ghost-' + player).style.width = value + '%';
    $('#health-bar-' + player).classList.toggle('danger', value <= DANGER_THRESHOLD);
    $('#health-label-' + player).textContent = value + '%';
  });
}

/** Damage a player: health bar, hit reaction and a floating "-N HP". */
export function damage(player, amount) {
  const health = [...state.health];
  const wasSafe = health[player] > DANGER_THRESHOLD;
  health[player] = Math.max(MIN_HEALTH, health[player] - amount);
  setHealth(health[0], health[1]);
  hurt(player);
  popText('-' + amount + ' HP', player ? 720 : 200, 220, '#f66', 18);
  if (wasSafe && health[player] <= DANGER_THRESHOLD) sfx.lowHealth();
}

export function setCaption(label, text) {
  $('#caption-text').innerHTML = `<b>[${label}]</b> ${text}`;
}
