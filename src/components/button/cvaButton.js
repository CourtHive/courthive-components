import { cva } from "class-variance-authority";
import "bulma/css/bulma.css";

export function renderButton({
  intent = "primary",
  size = "medium",
  label,
} = {}) {
  const button = cva("button", {
    variants: {
      intent: {
        primary: ["is-info"],
        secondary: ["is-success"],
      },
      size: {
        medium: ["font-medium"],
      },
    },
    compoundVariants: [
      { intent: "primary", size: "medium", textTransform: "uppercase" },
    ],
    defaultVariants: {
      intent: "primary",
      size: "medium",
    },
  });

  console.log(button({ intent, size }));

  return `<button class="${button({ intent, size })}">${label}</button>`;
}
