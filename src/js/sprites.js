import { $ } from './dom.js';

const SKIN = '#f0c08a';

/**
 * Create a canvas and let `draw` paint it with filled rectangles:
 * draw(rect) where rect(x, y, width, height, color).
 */
function drawPixelSprite(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw((x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  });
  return canvas;
}

/** DevOps boss, slouched in a chair, glued to a phone, surrounded by energy drinks. */
function drawBoss(rect) {
  // chair
  rect(38, 4, 18, 44, '#4a1f1f');
  rect(40, 6, 3, 40, '#6b2d2d');
  rect(24, 44, 34, 5, '#3a1717');
  rect(46, 49, 4, 6, '#222');
  rect(34, 55, 28, 2, '#222');
  // body and legs
  rect(20, 24, 20, 20, '#8d929c');
  rect(22, 26, 16, 2, '#7a7f88');
  rect(18, 44, 26, 7, '#2b2f3f');
  rect(12, 48, 8, 8, '#2b2f3f');
  rect(8, 55, 12, 3, '#ddd');
  // head and hair
  rect(12, 6, 14, 16, SKIN);
  rect(14, 5, 10, 2, SKIN);
  rect(10, 8, 3, 9, '#6b4a2b');
  rect(25, 8, 3, 9, '#6b4a2b');
  rect(11, 4, 3, 4, '#6b4a2b');
  rect(24, 3, 4, 4, '#6b4a2b');
  // glasses
  rect(13, 12, 5, 5, '#222');
  rect(14, 13, 3, 3, '#cfe9ff');
  rect(20, 12, 5, 5, '#222');
  rect(21, 13, 3, 3, '#cfe9ff');
  rect(18, 14, 2, 1, '#222');
  // beard and mouth
  rect(14, 19, 11, 3, '#a98866');
  rect(17, 19, 5, 1, '#8a4b3a');
  rect(16, 22, 7, 3, '#e0b07a');
  // arm holding the phone
  rect(14, 32, 12, 5, '#8d929c');
  rect(10, 31, 5, 6, SKIN);
  rect(17, 31, 3, 7, '#222');
  rect(18, 32, 1, 1, '#fff');
  // energy-drink cans on the floor
  const cans = [
    [1, 52, '#00c853'],
    [50, 52, '#e91e63'],
    [58, 50, '#00c853'],
    [28, 52, '#00e5ff'],
    [4, 44, '#e91e63'],
  ];
  for (const [x, y, color] of cans) {
    rect(x, y, 4, 6, color);
    rect(x, y, 4, 1, '#ccc');
  }
}

export function createBossSprite() {
  $('#boss-sprite').prepend(drawPixelSprite(64, 58, drawBoss));
}

/** Per fighter container: its canvas, idle/attack images, zoom and pending revert timer. */
const poses = new WeakMap();

function drawPose(canvas, image, zoom) {
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext('2d').drawImage(image, 0, 0);
  canvas.style.width = image.width * zoom + 'px';
}

/**
 * Load a fighter sprite sheet into a pixelated canvas inside `containerSelector`
 * (scaled by `zoom`), and paint its head-and-shoulders crop into the HUD portrait.
 * An optional `attackSrc` is preloaded and shown briefly by showAttackPose().
 */
export function loadFighterSprite(src, containerSelector, zoom, portraitSelector, attackSrc) {
  const container = $(containerSelector);
  const canvas = document.createElement('canvas');
  const idle = new Image();
  idle.onload = () => {
    drawPose(canvas, idle, zoom);
    container.prepend(canvas);
    const portraitCropHeight = idle.width * 0.727; // matches the 66×48 portrait ratio
    $(portraitSelector)
      .getContext('2d')
      .drawImage(idle, 0, 0, idle.width, portraitCropHeight, 0, 0, 66, 48);
  };
  idle.src = src;
  let attack = null;
  if (attackSrc) {
    attack = new Image();
    attack.src = attackSrc;
  }
  poses.set(container, { canvas, idle, attack, zoom, timer: 0 });
}

/** Swap the fighter in `container` to its attack sprite for `duration` ms, if it has one. */
export function showAttackPose(container, duration) {
  const pose = poses.get(container);
  if (!pose?.attack?.naturalWidth || !pose.idle.naturalWidth) return;
  clearTimeout(pose.timer);
  drawPose(pose.canvas, pose.attack, pose.zoom);
  pose.timer = setTimeout(() => drawPose(pose.canvas, pose.idle, pose.zoom), duration);
}
