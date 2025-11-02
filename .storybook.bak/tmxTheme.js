import { create } from "@storybook/theming/create";
import imageFile from "./CourtHive.png";

export default create({
  base: "light",
  brandTitle: "CourtHive",
  brandUrl: "https://github.com/courthive",
  brandImage: imageFile,
  brandTarget: "_self",
});
