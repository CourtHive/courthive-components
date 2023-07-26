import { css } from "@stitches/core";

export const sideContainerStyle = css({
  flexDirection: "column",
  position: "relative",
  display: "flex",
});

export const sideRowStyle = css({
  minHeight: "$lineHeights$participant",
  alignItems: "stretch",
  display: "flex",
});

export const tickStyles = css({
  marginInlineEnd: ".25rem",
  color: "green",
});
