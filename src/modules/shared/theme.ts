import { colorsTuple, createTheme, MantineColorsTuple } from "@mantine/core";

export const INK_ON_ACCENT = "#16270C";

// Mantine reads its dark theme from this scale: 0 text, 2 dimmed, 4 borders, 5 hover, 6 surfaces, 7 page.
const dark: MantineColorsTuple = [
  "#EEF5F1",
  "#D5E3DC",
  "#B4CBC1",
  "#8BA89C",
  "#4A7266",
  "#2B5247",
  "#16372F",
  "#0F2A26",
  "#0B211D",
  "#071815",
];

export const theme = createTheme({
  colors: {
    dark,
    accent: colorsTuple("#C8F169"),
  },
  primaryColor: "accent",
  primaryShade: 6,
  fontFamily: "'DM Sans', sans-serif",
  headings: {
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontWeight: "700",
  },
  defaultRadius: "md",
  components: {
    Input: { defaultProps: { size: "md" } },
    InputWrapper: { defaultProps: { size: "md" } },
    // Interactive targets are at least 44px tall. Mantine's default button size is sm (36px).
    Button: { defaultProps: { mih: 44 } },
  },
});
