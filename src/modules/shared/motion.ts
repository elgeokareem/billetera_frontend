import { useReducedMotion } from "@mantine/hooks";

/**
 * The duration of the soft motions of the app, such as a panel opening or a row fading in. One value, so every motion is
 * tuned together. It's 0 while the viewer asks for reduced motion, which turns the motion into an instant change.
 */
export const MOTION_MS = 250;

/** The duration a motion should use: MOTION_MS, or 0 when the viewer prefers reduced motion. */
export function useMotionDuration(): number {
  // Read the media query on the first render too, so a reduced-motion viewer never sees the first toggle animate.
  return useReducedMotion(false, { getInitialValueInEffect: false }) ? 0 : MOTION_MS;
}
