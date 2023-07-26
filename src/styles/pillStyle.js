import { css } from "@stitches/core";

export const pillStyle = css({
  width: "auto",
  display: "inline-block",
  textTransform: "uppercase",
  fontFamily: "Sharp Sans, Arial, sans-serif",
  fontSize: "0.625rem",
  lineHeight: "1rem",
  marginInline: "0.25rem 0.25rem",
  paddingInline: "0.25rem 0.25rem",
  fontWeight: 700,
  borderRadius: "4px",
  color: "#fff",
  textAlign: "center",
  whiteSpace: "nowrap",
  variants: {
    variant: {
      defaulted: {
        backgroundColor: "#df164c",
      },
      retired: {
        backgroundColor: "#df164c",
      },
      walkover: {
        backgroundColor: "black",
      },
      double_walkover: {
        backgroundColor: "black",
      },
    },
  },
});
