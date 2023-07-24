import { createTheme } from "./createTheme";

export const nightTheme = createTheme("dark-theme", {
  colors: {
    backgroundColor: "#333333",
    borderHover: "#0091d2",
    color: "white",
  },
  participant: {
    seed: "cyan",
  },
});
