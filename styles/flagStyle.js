import { css } from "@stitches/core";

export const flagStyle = css({
  WebkitBoxSizing: "border-box",
  display: "inline-block",
  boxSizing: "border-box",
  position: "relative",
  borderRadius: 2,
  variants: {
    variant: {
      doubles: {
        marginInlineStart: 1,
        marginInlineEnd: 1,
        width: ".5rem",
      },
      singles: {
        marginInlineStart: 1,
        marginInlineEnd: 1,
        width: ".75rem",
      },
    },
  },
});
