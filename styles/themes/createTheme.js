import { lineHeights } from "../../compositions/lineHeights";
import { createStitches } from "@stitches/core";

export const { createTheme } = createStitches({
  theme: {
    lineHeights: {
      scheduleInfo: `${lineHeights.scheduleInfo}rem`,
      centerInfo: `${lineHeights.centerInfo}rem`,
      gameScore: `${lineHeights.gameScore}rem`,
    },
    borderWidths: {
      matchUpInline: "1px 1px",
      matchUp: "1px",
    },
    space: {
      1: "10px",
      2: "0.375rem", // start/end spacing for individual
      gameMarginInlineEnd: "0.25rem",
    },
    fontSizes: {
      1: "0.875rem",
    },
    colors: {
      internalDividers: "lightgray",
      backgroundColor: "white",
      connector: "lightgray",
      border: "darkgray",
      color: "black",
    },
    participant: {
      textTransform: "capitalize",
      minHeight: `2rem`,
      seed: "gray",
    },
    score: {
      setWidth: "1.3rem",
    },
  },
});
