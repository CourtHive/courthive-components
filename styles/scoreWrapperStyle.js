import { css } from "@stitches/core";

export const scoreWrapperStyle = (participantHeight) => {
  return css({
    display: "flex",
    alignItems: "center",
    height: participantHeight,
    justifyContent: "flex-end",
    backgroundColor: "$matchUp",
    variants: {
      sideNumber: {
        1: {
          borderBottom: "1px solid $internalDividers",
        },
        // 2: { borderBottom: "1px solid $border" },
      },
      fontSize: {
        small: {
          fontSize: "smaller",
          paddingRight: "1em",
          color: "blue",
        },
      },
    },
  });
};
