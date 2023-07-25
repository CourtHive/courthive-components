import { createTheme } from "./createTheme";

export const itfTheme = createTheme("itf-theme", {
  borderWidths: {
    factor: 1,
  },
  colors: {
    connector: "#999",
    borderHover: "#0091d2",
    matchUp: "#fff",
  },
  participant: {
    textTransform: "uppercase",
    seed: "gray",
  },
});
