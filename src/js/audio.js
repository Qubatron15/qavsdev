import { $ } from './dom.js';
import { state } from './state.js';

/* All sounds are synthesised with the Web Audio API; there are no audio files. */

const VOLUME = 0.5;
let context;
let master;

/** Create the AudioContext lazily (browsers need a user gesture) and resume it. */
export function ensureAudio() {
  if (!context) {
    context = new (window.AudioContext || window.webkitAudioContext)();
    master = context.createGain();
    master.gain.value = state.muted ? 0 : VOLUME;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

/** Play an oscillator tone, optionally sweeping to `sweepTo` Hz. */
function tone(freq, type = 'square', duration = 0.15, volume = 0.2, sweepTo = 0, delay = 0) {
  const ctx = ensureAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Play a burst of low-pass filtered white noise that fades out. */
function noise(duration = 0.2, volume = 0.3, cutoff = 1500) {
  const ctx = ensureAudio();
  const length = (ctx.sampleRate * duration) | 0;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start();
}

const arpeggio = (notes, type, duration, volume, step) =>
  notes.forEach((freq, i) => tone(freq, type, duration, volume, 0, i * step));

export const sfx = {
  whoosh() {
    tone(150, 'sawtooth', 0.5, 0.15, 900);
    noise(0.5, 0.2, 3000);
  },
  hit() {
    tone(220, 'square', 0.2, 0.25, 40);
    noise(0.25, 0.4, 2500);
  },
  zap() {
    tone(1200, 'square', 0.05, 0.1, 300);
  },
  lowHealth() {
    tone(880, 'square', 0.08, 0.15);
    tone(880, 'square', 0.08, 0.15, 0, 0.15);
  },
  heal() {
    arpeggio([523, 659, 784, 1047], 'sine', 0.25, 0.2, 0.09);
  },
  boom() {
    tone(90, 'sine', 1.5, 0.6, 25);
    noise(1.2, 0.6, 600);
  },
  siren() {
    for (let i = 0; i < 6; i++) tone(i % 2 ? 600 : 850, 'sawtooth', 0.3, 0.12, 0, i * 0.3);
  },
  candy() {
    arpeggio([523, 659, 784, 659, 880, 784, 1047, 1319], 'triangle', 0.18, 0.25, 0.11);
  },
  fight() {
    arpeggio([392, 392, 523, 659, 784], 'square', 0.18, 0.15, 0.1);
  },
  /** Super flash: rising sweep, sizzle and a bright stab. */
  superFlash() {
    tone(180, 'sawtooth', 0.4, 0.16, 1800);
    tone(360, 'square', 0.35, 0.07, 2600, 0.03);
    noise(0.45, 0.25, 7000);
    arpeggio([1047, 1319, 1568, 2093], 'square', 0.1, 0.06, 0.04);
  },
  /** Heavy hit on top of sfx.hit: sub thump and a crack. */
  heavy() {
    tone(65, 'sine', 0.4, 0.55, 28);
    tone(2200, 'square', 0.04, 0.08, 500);
    noise(0.35, 0.45, 5000);
  },
  /** Guard: bright metallic ping. */
  guard() {
    tone(1500, 'triangle', 0.18, 0.15, 2400);
    tone(2250, 'sine', 0.12, 0.08, 0, 0.02);
    noise(0.12, 0.2, 9000);
  },
  sparkle() {
    arpeggio([1568, 2093, 2637, 3136], 'triangle', 0.09, 0.06, 0.035);
  },
};

export function toggleMute() {
  state.muted = !state.muted;
  if (master) master.gain.value = state.muted ? 0 : VOLUME;
  $('#sound-toggle').textContent = state.muted ? '🔇 MUTED [=]' : '🔊 SOUND [=]';
}
