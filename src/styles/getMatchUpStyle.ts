import { css } from "@stitches/core";
import type { Configuration } from "../types";

export function getMatchUpStyle({ configuration }: { configuration?: Configuration }): string {
  const matchUpStyle: any = {
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
  } else {
    matchUpStyle["&:hover"] = {
      borderColor: "$borderHover",
    };
  }

  return css(matchUpStyle)();
}
