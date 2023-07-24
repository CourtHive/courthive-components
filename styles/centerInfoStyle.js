import { css } from "@stitches/core";

export function getInfoStyle({ height, variant }) {
  const infoStyle = css({
    borderBottom: "solid 1px lightgray",
    backgroundColor: "$matchUp",
    width: "100%",
    height,
    variants: {
      variant: {
        1: {
          borderBottom: "solid 1px black",
        },
        2: {
          borderBottom: "solid 1px lightgray",
        },
      },
    },
  });

  return infoStyle({ variant });
}

export const columnStyle = css({
  justifyContent: "center",
  alignContent: "center",
  flexDirection: "column",
  height: "100%",
  display: "flex",
});

export const entryStyle = css({
  fontFamily: "Lato,Arial,Helvetica,sans-serif",
  WebkitFontSmooting: "antialiased",
  marginInlineStart: "calc(20%)",
  WebkitBoxOrient: "horizontal",
  WebKitBoxDirection: "normal",
  WebkitBoxPack: "center",
  boxSizing: "inherit",
  flexDirection: "row",
  display: "flex",
});

export const statusStyle = css({
  alignContent: "center",
  boxSizing: "inherit",
  fontFamily: "Lato",
  fontWeight: 900,
  fontSize: 9,
});
