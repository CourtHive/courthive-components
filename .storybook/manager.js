import { addons } from "@storybook/manager-api";
import tmxTheme from "./tmxTheme";

addons.setConfig({
  theme: tmxTheme,
});
