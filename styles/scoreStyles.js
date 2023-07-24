import { css } from "@stitches/core";

export const tieBreakStyle = css({
  letterSpacing: "-0.2em",
  lineHeight: "0.75rem",
  position: "absolute",
  fontSize: "0.625rem",
  left: "1.1rem",
  top: ".4rem",
});

export const gameScoreStyle = css({
  justifyContent: "center",
  width: "$score$setWidth",
  position: "relative",
  lineHeight: "2.5rem",
  fontWeight: 500,
  fontSize: "$1",
  display: "flex",
  margin: 0,

  variants: {
    variant: {
      winner: {
        color: "$winner!important",
        fontWeight: 700,
      },
      loser: {
        color: "$loser!important",
      },
    },
  },
});

export const gameWrapperStyle = css({
  marginInlineEnd: "$space$gameMarginInlineEnd",
  justifyContent: "flex-end",
  alignItems: "center",
  display: "flex",
});
