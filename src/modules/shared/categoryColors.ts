// The colours of the category segments, shared by the Dashboard's spending card and the Movements chart so both split
// categories the same way: the largest category first, in the accent, then the softer tones. Spending with no category is
// always the last segment, in the dimmest tone.

/** The colours of the named categories, in order. A chart cycles them when it has more series than tones. */
export const SEGMENT_COLORS = [
  "var(--mantine-color-accent-6)",
  "#8FC7A8",
  "#5C9C86",
  "#EEF5F1",
] as const;

/** The segment of spending with no category, last in the order and in the dimmest tone. */
export const NO_CATEGORY_COLOR = "var(--mantine-color-dark-4)";

/** The series that merges the categories after the largest ones, on a chart with a four-colour palette. */
export const OTHER_CATEGORY_COLOR = "var(--mantine-color-dark-2)";
