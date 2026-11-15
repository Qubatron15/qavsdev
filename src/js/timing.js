import { state } from './state.js';

export class BeatCancelled extends Error {
  constructor() {
    super('Beat cancelled by reset');
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sleep, then throw BeatCancelled if the arena was reset meanwhile. */
export async function wait(ms) {
  const generation = state.generation;
  await sleep(ms);
  if (generation !== state.generation) throw new BeatCancelled();
}
