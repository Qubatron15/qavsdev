import { $, fighter } from './dom.js';

// DevOps boss: disabled
// const SKIN = '#f0c08a';
//
// /**
//  * Create a canvas and let `draw` paint it with filled rectangles:
//  * draw(rect) where rect(x, y, width, height, color).
//  */
// function drawPixelSprite(width, height, draw) {
//   const canvas = document.createElement('canvas');
//   canvas.width = width;
//   canvas.height = height;
//   const ctx = canvas.getContext('2d');
//   draw((x, y, w, h, color) => {
//     ctx.fillStyle = color;
//     ctx.fillRect(x, y, w, h);
//   });
//   return canvas;
// }
//
// /** DevOps boss, slouched in a chair, glued to a phone, surrounded by energy drinks. */
// function drawBoss(rect) {
//   // chair
//   rect(38, 4, 18, 44, '#4a1f1f');
//   rect(40, 6, 3, 40, '#6b2d2d');
//   rect(24, 44, 34, 5, '#3a1717');
//   rect(46, 49, 4, 6, '#222');
//   rect(34, 55, 28, 2, '#222');
//   // body and legs
//   rect(20, 24, 20, 20, '#8d929c');
//   rect(22, 26, 16, 2, '#7a7f88');
//   rect(18, 44, 26, 7, '#2b2f3f');
//   rect(12, 48, 8, 8, '#2b2f3f');
//   rect(8, 55, 12, 3, '#ddd');
//   // head and hair
//   rect(12, 6, 14, 16, SKIN);
//   rect(14, 5, 10, 2, SKIN);
//   rect(10, 8, 3, 9, '#6b4a2b');
//   rect(25, 8, 3, 9, '#6b4a2b');
//   rect(11, 4, 3, 4, '#6b4a2b');
//   rect(24, 3, 4, 4, '#6b4a2b');
//   // glasses
//   rect(13, 12, 5, 5, '#222');
//   rect(14, 13, 3, 3, '#cfe9ff');
//   rect(20, 12, 5, 5, '#222');
//   rect(21, 13, 3, 3, '#cfe9ff');
//   rect(18, 14, 2, 1, '#222');
//   // beard and mouth
//   rect(14, 19, 11, 3, '#a98866');
//   rect(17, 19, 5, 1, '#8a4b3a');
//   rect(16, 22, 7, 3, '#e0b07a');
//   // arm holding the phone
//   rect(14, 32, 12, 5, '#8d929c');
//   rect(10, 31, 5, 6, SKIN);
//   rect(17, 31, 3, 7, '#222');
//   rect(18, 32, 1, 1, '#fff');
//   // energy-drink cans on the floor
//   const cans = [
//     [1, 52, '#00c853'],
//     [50, 52, '#e91e63'],
//     [58, 50, '#00c853'],
//     [28, 52, '#00e5ff'],
//     [4, 44, '#e91e63'],
//   ];
//   for (const [x, y, color] of cans) {
//     rect(x, y, 4, 6, color);
//     rect(x, y, 4, 1, '#ccc');
//   }
// }
//
// export function createBossSprite() {
//   $('#boss-sprite').prepend(drawPixelSprite(64, 58, drawBoss));
// }

/** Fighter display height in stage pixels; every pose is scaled to it. */
export const FIGHTER_HEIGHT = 230;

/** Per player: its <img>, preloaded pose images, current pose and pending revert timer. */
const fighters = [];

/**
 * Load a fighter's pose images (stand / throw / block / hit / jump) into an <img> inside the
 * fighter container, and paint a head-and-shoulders crop of the stand pose into the HUD portrait.
 */
export function loadFighter(player, poseSources, portraitSelector) {
  const container = fighter(player);
  const img = document.createElement('img');
  img.alt = '';
  img.draggable = false;
  img.style.height = FIGHTER_HEIGHT + 'px';
  container.prepend(img);

  const images = {};
  for (const [name, src] of Object.entries(poseSources)) {
    images[name] = new Image();
    images[name].src = src;
  }
  images.stand.addEventListener('load', () => drawPortrait(images.stand, portraitSelector));

  fighters[player] = { img, images, pose: '', timer: 0 };
  setPose(player, 'stand');
}

/**
 * Find the head in a sprite: the first row with opaque pixels is the top of the head,
 * and the middle of the opaque pixels just below it is its horizontal centre.
 * Sprites differ in how much empty space surrounds the character, so a fixed crop won't do.
 */
function findHead(image) {
  const { width, height } = image;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const alpha = ctx.getImageData(0, 0, width, height).data;
  const opaque = (x, y) => alpha[(y * width + x) * 4 + 3] > 128;

  let top = 0;
  while (top < height && ![...Array(width).keys()].some((x) => opaque(x, top))) top++;

  const headRows = Math.round(height * 0.12);
  let sum = 0;
  let count = 0;
  for (let y = top; y < Math.min(height, top + headRows); y += 2) {
    for (let x = 0; x < width; x++) {
      if (opaque(x, y)) {
        sum += x;
        count++;
      }
    }
  }
  return { top, centerX: count ? sum / count : width / 2 };
}

/** Paint a head-and-shoulders crop of `image`, centred on the head, into the HUD portrait. */
function drawPortrait(image, portraitSelector) {
  const { top, centerX } = findHead(image);
  const cropWidth = image.width * 0.62;
  const cropHeight = cropWidth * 0.727; // matches the 66×48 portrait ratio
  const x = Math.min(image.width - cropWidth, Math.max(0, centerX - cropWidth / 2));
  const y = Math.max(0, top - cropHeight * 0.08); // a little headroom
  $(portraitSelector).getContext('2d').drawImage(image, x, y, cropWidth, cropHeight, 0, 0, 66, 48);
}

/** Show pose `name` ('stand' | 'throw' | 'block' | 'hit' | 'jump') for a player. */
export function setPose(player, name) {
  const entry = fighters[player];
  if (!entry || entry.pose === name) return;
  entry.pose = name;
  entry.img.src = entry.images[name].src;
}

/** Briefly show a pose, then return to standing (used by the story beats). */
export function flashPose(player, name, duration) {
  const entry = fighters[player];
  if (!entry) return;
  clearTimeout(entry.timer);
  setPose(player, name);
  entry.timer = setTimeout(() => setPose(player, 'stand'), duration);
}

/** Image URL of a pose (for cut-ins and afterimages). */
export const poseSrc = (player, name) => fighters[player]?.images[name]?.src ?? '';
