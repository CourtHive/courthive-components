import { renderIndividual } from "../components/renderIndividual";

export default {
  title: "Participants/Individual",
  tags: ["autodocs"],
  render: ({ ...args }) => {
    return renderIndividual({ ...args });
  },
  argTypes: {
    name: { control: "text" },
    seedNumber: { control: "text" },
    address: { control: "text" },
  },
};

const composition = {
  configuration: { bracketedSeeds: "square", flags: true, showAddress: true },
};

export const Basic = {
  args: {
    individualParticipant: {
      participantName: "Thornstein Veblen",
    },
    composition: { configuration: { flags: false } },
  },
};

export const Seeded = {
  args: {
    individualParticipant: {
      participantName: "Thornstein Veblen",
      person: { iso2NationalityCode: "USA" },
    },
    side: { seedValue: 1 },
    composition,
  },
};

export const supSeed = {
  args: {
    individualParticipant: {
      participantName: "Thornstein Veblen",
      person: { iso2NationalityCode: "USA" },
    },
    side: { seedValue: 1 },
    composition: { configuration: { seedingElement: "sup" } },
  },
};

export const Unseeded = {
  args: {
    individualParticipant: {
      participantName: "Thornstein Veblen",
      person: { iso2NationalityCode: "USA" },
    },
    composition,
  },
};

export const FlagAddress = {
  args: {
    individualParticipant: {
      participantName: "Thornstein Veblen",
      person: {
        iso2NationalityCode: "USA",
        addresses: [{ city: "Atlanta", state: "GA" }],
      },
    },
    matchUp: { matchUpType: "SINGLES" },
    composition,
  },
};

export const scaleAddress = {
  args: {
    matchUp: { matchUpType: "SINGLES" },
    individualParticipant: {
      participantName: "Thornstein Veblen",
      ratings: { SINGLES: { WTN: 13.5 } },
      person: {
        addresses: [{ city: "Atlanta", state: "GA" }],
      },
    },
    composition: {
      configuration: {
        scaleAttributes: { scaleType: "RATING", accessor: "WTN" },
        showAddress: true,
      },
    },
  },
};

export const Address = {
  args: {
    individualParticipant: {
      participantName: "Thornstein Veblen",
      person: {
        iso2NationalityCode: "USA",
        addresses: [{ city: "Atlanta", state: "GA" }],
      },
    },
    composition: {
      configuration: { showAddress: true },
    },
  },
};
