import { css } from "@stitches/core";

export const resultsItemStyle = css({
  width: "$score$setWidth",
  display: "inline-block",
  fontSize: 9,

  variants: {
    variant: {
      set: {
        textAlign: "center",
      },
      points: {
        marginInlineEnd: 3,
      },
    },
  },
});

export const resultsInfoStyle = css({
  transform: "translateY(-50%)",
  textTransform: "uppercase",
  backgroundColor: "#fff",
  top: `calc(50% - 2px)`,
  position: "absolute",
  textAlign: "center",
  color: "#bbb",
  fontSize: 0,
  right: 4,
});
