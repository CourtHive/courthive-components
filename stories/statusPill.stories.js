import { renderStatusPill } from "../components/renderStatusPill";

export default {
  title: "MatchUps/Status",
  tags: ["autodocs"],
  render: ({ ...args }) => {
    return renderStatusPill({ ...args });
  },
};

export const Walkover = {
  args: {
    matchUpStatus: "WALKOVER",
  },
};

export const Retirement = {
  args: {
    matchUpStatus: "RETIRED",
  },
};
