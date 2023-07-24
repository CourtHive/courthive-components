import { css } from "@stitches/core";

export function renderGameScore({ value } = {}) {
  const gameScoreStyle = css({
    fontWeight: 500,
    position: "relative",
    margin: 0,
    width: "$score$setWidth",
    display: "flex",
    justifyContent: "center",
    fontSize: "$1",
    lineHeight: "2.5rem",
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

  const input = document.createElement("input");
  input.className = gameScoreStyle;
  input.value = value;

  return input;
}
