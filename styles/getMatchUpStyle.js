import { css } from "@stitches/core";

/*
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
  position: "relative",
  display: "grid",
  width: "100%",
});
*/

export function getMatchUpStyle({ configuration }) {
  const matchUpStyle = {
    backgroundColor: "$matchUpBackgroundColor",
    WebkitTransition: "all 0.30s linear",
    boxShadow: "$matchUp$boxShadow",
    transition: "all 0.30s linear",
    border: "solid $border",
    marginBottom: "$space$1",
    marginTop: "$space$1",
    position: "relative",
    display: "grid",
    width: "100%",
    // IMPORTANT: must come last
    borderInlineStartWidth: "$borderWidths$borderInlineStart",
  };
  if (configuration?.matchUpHover) {
    const backgroundColor =
      typeof configuration.matchUpHover === "string"
        ? configuration.matchUpHover
        : "cyan";
    matchUpStyle["&:hover"] = { backgroundColor };
  }
  return css(matchUpStyle);
}
