import { createTheme } from "./createTheme";

export const frenchTheme = createTheme("french-theme", {
  colors: {
    winner: "#01503d!important",
    winnerName: "#01503d!important",
    borderHover: "#0091d2",
    connector: "lightgray",
    borderInlineStart: "#F8F9F9",
    border: "#F8F9F9",
  },
  matchUp: {
    boxShadow: "0 0 30px 0 hsla(0,0%,89%,9)",
  },
});
