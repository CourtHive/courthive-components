import { renderButton } from "../components/button/cvaButton";

export default {
  title: "Example/Button",
  tags: ["autodocs"],
  render: ({ ...args }) => {
    return renderButton({ ...args });
  },
  argTypes: {
    name: { control: "text" },
    seedNumber: { control: "text" },
    address: { control: "text" },
  },
};

export const Primary = {
  args: {
    label: "Primary",
  },
};

export const Secondary = {
  args: {
    label: "Secondary",
    intent: "secondary",
  },
};
