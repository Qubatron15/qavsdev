/*
 * Christmas edition: purely cosmetic. Santa hats baked into the fighter sprites, a decorated
 * arena (lights, tree, presents, wreath, neon sign, stockings, mistletoe), falling snow and a
 * festive finale. Attack names, controls and fight mechanics are untouched.
 */
import { $ } from './dom.js';
import { spawn, removeAfter } from './effects.js';
import santaHatSrc from '../assets/christmas/santa-hat.png';

/* ── Santa hats ─────────────────────────────────────────────────────────── */

/** Empty space added above every sprite so the hat is never cut off (fraction of its height). */
export const HAT_PAD = 0.1;

const HAT_SCALE = 4.2;
// Bottom centre of the hat's brim, in hat-image pixels
const BRIM_X = 14.5;
const BRIM_Y = 26;

/**
 * Where the brim sits on each pose, in sprite pixels: [x, y, tilt in degrees].
 * Emilia faces left, so the hat droops to the right; Kuba faces right, so it is mirrored.
 */
const HAT_ANCHORS = {
  emi: {
    stand: [160, 116, -8],
    throw: [160, 116, -8],
    block: [160, 113, -8],
    hit: [98, 168, -35],
    jump: [172, 118, -15],
  },
  kuba: {
    stand: [180, 70, 8],
    throw: [190, 80, 8],
    block: [165, 70, 0],
    hit: [292, 118, 25],
    jump: [190, 100, 10],
  },
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

let hatImage;

/**
 * Return a data URL of the sprite with a Santa hat painted on its head (and HAT_PAD of headroom).
 * Falls back to the original sprite if anything goes wrong.
 */
export async function withSantaHat(src, who, pose) {
  try {
    hatImage ??= loadImage(santaHatSrc);
    const [sprite, hat] = await Promise.all([loadImage(src), hatImage]);
    const anchor = HAT_ANCHORS[who]?.[pose];
    const pad = Math.round(sprite.height * HAT_PAD);
    const canvas = document.createElement('canvas');
    canvas.width = sprite.width;
    canvas.height = sprite.height + pad;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, 0, pad);
    if (anchor) {
      const [x, y, tilt] = anchor;
      const mirrored = who === 'kuba';
      ctx.save();
      ctx.translate(x, y + pad);
      ctx.rotate((tilt * Math.PI) / 180);
      if (mirrored) ctx.scale(-1, 1);
      ctx.drawImage(
        hat,
        -BRIM_X * HAT_SCALE,
        -BRIM_Y * HAT_SCALE,
        hat.width * HAT_SCALE,
        hat.height * HAT_SCALE,
      );
      ctx.restore();
    }
    return canvas.toDataURL();
  } catch {
    return src;
  }
}

/* ── Arena decorations ──────────────────────────────────────────────────── */

const BULB_COLORS = ['#ff2d3d', '#2fe36b', '#ffd23b', '#3ba7ff', '#ff6ad5'];

/** A sagging string of fairy lights across the top of the arena. */
function lightsGarland() {
  const swags = 8;
  const width = 960;
  const step = width / swags;
  let wire = 'M0 4';
  let bulbs = '';
  for (let s = 0; s < swags; s++) {
    const x0 = s * step;
    wire += ` Q${x0 + step / 2} 34 ${x0 + step} 4`;
    for (let b = 1; b <= 4; b++) {
      const t = b / 5;
      const x = x0 + t * step;
      const y = (1 - t) * (1 - t) * 4 + 2 * (1 - t) * t * 34 + t * t * 4;
      const i = s * 4 + b;
      const color = BULB_COLORS[i % BULB_COLORS.length];
      bulbs +=
        `<g class="bulb" style="--c:${color};animation-delay:${-(i % 3) * 0.5}s">` +
        `<rect x="${x - 2}" y="${y}" width="4" height="3" fill="#2a3a2a"/>` +
        `<ellipse cx="${x}" cy="${y + 8}" rx="4" ry="6"/></g>`;
    }
  }
  return (
    `<svg class="xmas-lights" viewBox="0 0 960 46" width="960" height="46">` +
    `<path class="wire" d="${wire}"/>${bulbs}</svg>`
  );
}

/** Pixel Christmas tree with blinking baubles and a star on top. */
const TREE = `
<svg class="xmas-tree" viewBox="0 0 96 150" width="96" height="150" shape-rendering="crispEdges">
  <polygon class="star" points="48,0 52,9 62,9 54,15 57,25 48,19 39,25 42,15 34,9 44,9"/>
  <polygon class="leaf d" points="48,18 76,58 20,58"/>
  <polygon class="leaf" points="48,22 70,54 26,54"/>
  <polygon class="leaf d" points="48,40 86,92 10,92"/>
  <polygon class="leaf" points="48,44 80,88 16,88"/>
  <polygon class="leaf d" points="48,70 96,128 0,128"/>
  <polygon class="leaf" points="48,74 90,124 6,124"/>
  <path class="tinsel" d="M30 50 Q48 60 66 46 M22 82 Q48 96 74 76 M12 118 Q48 132 86 110"/>
  <rect class="trunk" x="40" y="128" width="16" height="16"/>
  <g class="baubles">
    <circle cx="40" cy="44" r="3.5" style="--c:#ff2d3d"/>
    <circle cx="58" cy="50" r="3.5" style="--c:#ffd23b"/>
    <circle cx="30" cy="80" r="4" style="--c:#3ba7ff"/>
    <circle cx="52" cy="70" r="4" style="--c:#ff2d3d"/>
    <circle cx="68" cy="84" r="4" style="--c:#ff6ad5"/>
    <circle cx="20" cy="116" r="4.5" style="--c:#ffd23b"/>
    <circle cx="44" cy="106" r="4.5" style="--c:#ff6ad5"/>
    <circle cx="64" cy="118" r="4.5" style="--c:#3ba7ff"/>
    <circle cx="80" cy="114" r="4.5" style="--c:#ff2d3d"/>
  </g>
</svg>`;

/** A wrapped present. */
const present = (w, h, box, ribbon) => `
<svg class="xmas-present" viewBox="0 0 ${w} ${h + 6}" width="${w}" height="${h + 6}" shape-rendering="crispEdges">
  <rect x="0" y="6" width="${w}" height="${h}" fill="${box}" stroke="#000" stroke-width="1"/>
  <rect x="${w / 2 - 2}" y="6" width="4" height="${h}" fill="${ribbon}"/>
  <rect x="0" y="${6 + h / 3}" width="${w}" height="3" fill="${ribbon}"/>
  <path d="M${w / 2} 6 l-6 -5 l0 5 Z M${w / 2} 6 l6 -5 l0 5 Z" fill="${ribbon}"/>
</svg>`;

const WREATH = `
<svg class="xmas-wreath" viewBox="0 0 64 70" width="64" height="70">
  <circle cx="32" cy="30" r="22" class="ring"/>
  <circle cx="32" cy="30" r="22" class="ring-hi"/>
  <g class="berries">
    <circle cx="14" cy="22" r="3"/><circle cx="50" cy="20" r="3"/><circle cx="12" cy="40" r="3"/>
    <circle cx="52" cy="42" r="3"/><circle cx="24" cy="50" r="3"/><circle cx="42" cy="9" r="3"/>
  </g>
  <path class="bow" d="M32 50 l-12 -8 v14 Z M32 50 l12 -8 v14 Z M32 50 l-7 18 h4 l3 -12 l3 12 h4 Z"/>
  <circle cx="32" cy="50" r="3" class="bow"/>
</svg>`;

const MISTLETOE = `
<svg class="xmas-mistletoe" viewBox="0 0 40 70" width="40" height="70">
  <line x1="20" y1="0" x2="20" y2="44" stroke="#c22" stroke-width="2"/>
  <path d="M20 44 q-16 -6 -18 8 q14 2 18 -8 Z M20 44 q16 -6 18 8 q-14 2 -18 -8 Z" fill="#3c9a4a" stroke="#1b4d24"/>
  <circle cx="17" cy="48" r="3" fill="#fff"/><circle cx="23" cy="48" r="3" fill="#fff"/><circle cx="20" cy="52" r="3" fill="#fff"/>
  <path d="M20 40 l-8 -6 v8 Z M20 40 l8 -6 v8 Z" fill="#e01c2c"/>
</svg>`;

const stocking = (color, label) => `
<div class="xmas-stocking" style="--c:${color}">
  <svg viewBox="0 0 22 34" width="22" height="34" shape-rendering="crispEdges">
    <rect x="2" y="0" width="16" height="7" fill="#fafafa" stroke="#000"/>
    <path d="M4 7 h12 v14 l4 4 v6 h-12 l-6 -6 v-4 h2 Z" fill="var(--c)" stroke="#000"/>
  </svg>
  <span>${label}</span>
</div>`;

/** Falling snow over the arena (sits in the ambient layer, behind the fighters). */
function snowfall() {
  const layer = document.createElement('div');
  layer.className = 'xmas-snow';
  for (let i = 0; i < 70; i++) {
    const flake = document.createElement('i');
    const size = 2 + Math.random() * 4;
    Object.assign(flake.style, {
      left: Math.random() * 960 + 'px',
      width: size + 'px',
      height: size + 'px',
      opacity: 0.35 + Math.random() * 0.6,
      animationDuration: 6 + Math.random() * 8 + 's, ' + (2 + Math.random() * 3) + 's',
      animationDelay: -Math.random() * 14 + 's, ' + -Math.random() * 3 + 's',
    });
    layer.appendChild(flake);
  }
  return layer;
}

function add(parent, html) {
  parent.insertAdjacentHTML('beforeend', html);
  return parent.lastElementChild;
}

export function initChristmas() {
  const scene = $('#scene');
  const pc = scene.querySelector('.half.pc');
  const console_ = scene.querySelector('.half.console');

  // PC side: a wreath on the wall and a pile of presents by the tower
  add(pc, WREATH);
  const pcGifts = add(pc, '<div class="xmas-gifts pc-gifts"></div>');
  pcGifts.innerHTML =
    present(26, 20, '#2fb34a', '#ffd23b') +
    present(20, 28, '#e0283a', '#fff') +
    present(18, 14, '#3b7dd8', '#ff6ad5');

  // Console side: neon sign over the TV, a tree in the corner with presents under it
  add(
    console_,
    '<div class="xmas-neon"><span class="r">MERRY</span> <span class="g">XMAS</span><small>&amp; BUG-FREE NEW YEAR</small></div>',
  );
  add(console_, TREE);
  const treeGifts = add(console_, '<div class="xmas-gifts tree-gifts"></div>');
  treeGifts.innerHTML =
    present(24, 18, '#e0283a', '#ffd23b') +
    present(30, 24, '#ffd23b', '#e0283a') +
    present(20, 16, '#9b59d0', '#fff') +
    present(26, 20, '#2fb34a', '#fff');

  // Centre: candy-cane pillar with the players' stockings, mistletoe hanging between the fighters
  const pillar = scene.querySelector('.pillar');
  add(pillar, stocking('#00b8d4', '1P'));
  add(pillar, stocking('#e040b8', '2P'));
  add(scene, MISTLETOE);
  add(scene, lightsGarland());

  $('#ambient').appendChild(snowfall());
}

/* ── Finale ─────────────────────────────────────────────────────────────── */

const CONFETTI = ['🎁', '❄', '🎄', '⭐', '🔔', '🍬', '❄', '🎁'];

/** A burst of presents and snowflakes raining over the arena, plus a "HO HO HO!". */
export function christmasCelebration() {
  for (let i = 0; i < 36; i++) {
    const x = 40 + Math.random() * 880;
    const el = spawn('xmas-confetti', CONFETTI[i % CONFETTI.length], x, -40);
    el.style.fontSize = 16 + Math.random() * 18 + 'px';
    const drift = (Math.random() - 0.5) * 160;
    const spin = (Math.random() - 0.5) * 720;
    el.animate(
      [
        { transform: 'translate(0, 0) rotate(0)', opacity: 1 },
        { transform: `translate(${drift}px, 620px) rotate(${spin}deg)`, opacity: 0.9 },
      ],
      {
        duration: 2200 + Math.random() * 1600,
        delay: Math.random() * 900,
        easing: 'ease-in',
        fill: 'both',
      },
    );
    removeAfter(el, 4800);
  }
  const ho = spawn(
    'xmas-hohoho',
    'HO HO HO!<br><small>MERRY CHRISTMAS!</small>',
    0,
    110,
    $('#fx-top'),
  );
  removeAfter(ho, 4000);
}
