import { createTheme } from "./createTheme";

export const wimbledonTheme = createTheme("wimbledon-theme", {
  borderWidths: {
    matchUpInline: "10px 1px",
    matchUp: "10px",
  },
  matchUp: {
    borderInlineStart: "10px solid green",
  },
  colors: {
    connector: "transparent",
    borderHover: "lightgray",
    border: "#00703c",
    matchUp: "#fff",
  },
  participant: {
    textTransform: "uppercase",
  },
});
