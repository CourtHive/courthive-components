import { createTheme } from "./createTheme";

export const wimbledonTheme = createTheme("wimbledon-theme", {
  borderWidths: {
    // borderInlineStart: "10px", // Not in type definition
  },
  colors: {
    connector: "transparent",
    // borderHover: "darkgrey", // Not in type definition
    border: "#00703c",
    matchUp: "#fff",
  },
  participant: {
    textTransform: "uppercase",
  },
});
