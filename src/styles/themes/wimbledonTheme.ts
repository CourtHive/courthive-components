import { createTheme } from "./createTheme";

export const wimbledonTheme = createTheme("wimbledon-theme", {
  borderWidths: {
    borderInlineStart: "10px",
  },
  colors: {
    connector: "transparent",
    borderHover: "darkgrey",
    border: "#00703c",
    matchUp: "#fff",
  },
  participant: {
    textTransform: "uppercase",
  },
});
