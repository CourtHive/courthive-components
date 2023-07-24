import { renderTick } from "../components/renderTick";

export default {
  title: "Example/Tick",
  tags: ["autodocs"],
  render: ({ ...args }) => {
    return renderTick({ ...args });
  },
};

export const Tick = {
  args: {},
};
