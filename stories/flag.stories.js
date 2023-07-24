import { renderFlag } from "../components/renderFlag";

export default {
  title: "Example/Flag",
  tags: ["autodocs"],
  render: ({ ...args }) => {
    return renderFlag({ ...args });
  },
};

export const unitedStates = {
  args: {
    individualParticipant: { person: { iso2NationalityCode: "USA" } },
  },
};
export const spain = {
  args: {
    individualParticipant: { person: { iso2NationalityCode: "ESP" } },
  },
};
