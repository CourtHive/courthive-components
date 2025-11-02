import { css } from "@stitches/core";

export function getSelectedMatchUpStyle(): string {
  return css({
    backgroundColor: "magenta",
    position: "absolute",
    opacity: "0.2",
    height: "100%",
    width: "100%",
    top: 0,
  })();
}
