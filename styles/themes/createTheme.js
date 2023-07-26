import { lineHeights } from "../../compositions/lineHeights";
import { createStitches } from "@stitches/core";

export const { createTheme } = createStitches({
  theme: {
    lineHeights: {
      scheduleInfo: `${lineHeights.scheduleInfo}rem`,
      participant: `${lineHeights.participant}rem`,
      centerInfo: `${lineHeights.centerInfo}rem`,
    },
    borderWidths: {
      matchUpInline: "1px 1px",
      matchUp: "1px",
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
      borderInlineStart: "darkgray",
      internalDividers: "lightgray",
      backgroundColor: "white",
      connector: "lightgray",
      border: "darkgray",
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
