/** Shared mutable state for the arena. */
export const state = {
  /** Health of [dev, qa] in percent. */
  health: [100, 100],
  /** Whether sound is muted. */
  muted: false,
  /** Whether the case-study slide is showing. */
  caseStudyOpen: false,
  /**
   * Incremented on every reset. A running beat checks it after each wait and
   * stops if it changed, so a reset cancels any animation still in progress.
   */
  generation: 0,
};
