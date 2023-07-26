import { createTheme } from "./createTheme";

export const itfTheme = createTheme("itf-theme", {
  borderWidths: { factor: 1 },
  colors: {
    borderHover: "#0091d2",
    connector: "#999",
    matchUp: "#fff",
  },
  participant: {
    textTransform: "uppercase",
    seed: "gray",
  },
});
