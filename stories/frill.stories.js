import { renderFrill } from "../components/renderFrill";

export default {
  title: "Example/Frill",
  tags: ["autodocs"],
  render: ({ ...args }) => {
    return renderFrill({ ...args });
  },
};

const composition = {
  configuration: {
    scaleAttributes: { scaleType: "RATING", accessor: "WTN" },
    bracketedSeeds: "square",
    flags: true,
  },
};
const individualParticipant = {
  person: { iso2NationalityCode: "USA" },
  ratings: { SINGLES: { WTN: 13.5 } },
};

export const flag = {
  args: {
    individualParticipant,
    type: "flag",
    composition,
  },
};

export const seeding = {
  args: {
    individualParticipant,
    side: { seedValue: 1 },
    type: "seeding",
    composition,
  },
};

export const WTN = {
  args: {
    individualParticipant,
    side: { seedValue: 1 },
    type: "scale",
    composition,
  },
};
