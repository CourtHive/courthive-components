import { renderGameScore } from "../components/renderGameScore";

export default {
  title: "Example/Game Score",
  tags: ["autodocs"],
  render: ({ ...args }) => {
    return renderGameScore({ ...args });
  },
  argTypes: {
    name: { control: "text" },
    seedNumber: { control: "text" },
    address: { control: "text" },
  },
};

export const Primary = {
  args: {
    value: 0,
  },
};
