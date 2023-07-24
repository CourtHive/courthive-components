import { createStitches } from "@stitches/core";

export const { createTheme } = createStitches({
  theme: {
    borderWidths: {
      matchUp: "1px",
      matchUpInline: "1px 1px",
      factor: 2,
    },
    space: {
      1: "10px",
      2: "0.375rem", // start/end spacing for individual
      gameMarginInlineEnd: "0.25rem",
    },
    fontSizes: {
      1: "0.875rem",
    },
    matchUp: {
      borderInlineStart: "1px 1px",
    },
    colors: {
      backgroundColor: "white",
      border: "darkgray",
      borderInlineStart: "darkgray",
      internalDividers: "lightgray",
      color: "black",
    },
    participant: {
      textTransform: "capitalize",
      seed: "gray",
    },
    score: {
      setWidth: "1.5rem",
    },
  },
});
