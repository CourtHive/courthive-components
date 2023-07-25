import { css } from "@stitches/core";

export const matchUpStyle = css({
  borderInlineWidth: "$borderWidths$matchUpInline",
  borderBlockStartWidth: "$borderWidths$matchUp",
  borderBlockEndWidth: "$borderWidths$matchUp",
  backgroundColor: "$matchUpBackgroundColor",
  WebkitTransition: "all 0.30s linear",
  boxShadow: "$matchUp$boxShadow",
  transition: "all 0.30s linear",
  border: "solid $border",
  marginBottom: "$space$1",
  marginTop: "$space$1",
  display: "grid",
  width: "100%",
});
