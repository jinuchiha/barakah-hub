import { Easing } from 'react-native-reanimated';

/**
 * The one motion system.
 *
 * Before this file the app carried ~54 independent motion definitions: 23
 * explicit durations, 6 driven by variables, 17 delay values and 13 spring
 * call sites with roughly 14 distinct damping/stiffness pairs. Nothing was
 * shared, so two screens doing the same job moved at different speeds.
 *
 * Three tokens carry almost everything. The two exceptions below are
 * deliberate and documented — collapsing them into the three would make the
 * product worse, not more consistent:
 *
 *   · A PIN keypad dot at 150ms feels laggy under the thumb. It needs to
 *     land essentially with the touch.
 *   · A chart or progress bar drawing itself in 320ms reads as a glitch
 *     rather than a reveal.
 *
 * Anything outside this file needs a comment saying why.
 */
export const duration = {
  /** Press, input focus, micro-interaction. */
  fast: 150,
  /** Sheets, collapse/reveal, tab and state changes. The default. */
  standard: 220,
  /** Confirmation moments: verification success, the dua overlay. */
  emphasized: 320,

  /** EXCEPTION — keypad/PIN feedback must land with the finger. */
  instant: 60,
  /** EXCEPTION — chart and progress reveal reads as a draw, not a transition. */
  dataviz: 500,
} as const;

/**
 * Stagger step for lists that genuinely benefit from sequencing.
 * Cap the sequence at three items: past that it stops reading as rhythm and
 * starts reading as the screen being slow.
 */
export const stagger = { step: 40, maxItems: 3 } as const;

export const easing = {
  /** Entering and most state changes — decelerate into place. */
  standard: Easing.out(Easing.cubic),
  /** Leaving the screen — accelerate away, so an interruption stays cheap. */
  exit: Easing.in(Easing.cubic),
  /** Continuous motion only (shimmer). Never for a discrete transition. */
  linear: Easing.linear,
} as const;

/** Two presets replacing ~14 ad-hoc damping/stiffness pairs. */
export const spring = {
  /** Buttons, tabs, anything answering a finger. */
  press: { damping: 15, stiffness: 400, mass: 1 },
  /** Cards, sheets, layout settling into position. */
  settle: { damping: 18, stiffness: 200, mass: 1 },
} as const;

/**
 * Perpetual animation is prohibited by default.
 *
 * Three loops survive review, each because it communicates live state rather
 * than decorating: a skeleton shimmer says "still loading", a pending pulse
 * says "not settled yet", typing dots say "a reply is coming". Every one of
 * them must also be gated on the reduced-motion preference.
 *
 * Decorative loops were removed: the login backdrop (9000ms rotation,
 * 2400ms sine pulse, 1600ms glow), the dashboard ambient drift (5200ms),
 * the BarakahField word drift, and the empty-state pulse (2000ms).
 */
export const loop = {
  shimmer: 1200,
  pending: 1200,
  typing: 400,
} as const;

export type DurationToken = keyof typeof duration;
