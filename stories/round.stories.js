/*
import { renderContainer } from "../components/renderContainer";
import { generateMatchUps } from "../data/generateMatchUps";
import { generateRound } from "../components/generateRound";

function renderRound({ composition, roundNumber }) {
  const { matchUps } = generateMatchUps({ drawSize: 16 });
  const round = generateRound({ composition, roundNumber, matchUps });
  const content = renderContainer({
    theme: composition?.theme,
    content: round,
  });
  return content;
}

export default {
  title: "Example/Rounds",
  tags: ["autodocs"],
  render: ({ ...args }) => {
    return renderRound({ ...args });
  },
  argTypes: {
    name: { control: "text" },
    seedNumber: { control: "text" },
    address: { control: "text" },
  },
};

export const Wimbledon = {
  args: {
    roundNumber: 1,
  },
};
*/

import { renderContainer } from "../components/renderContainer";
import { generateMatchUps } from "../data/generateMatchUps";
import { compositions } from "../compositions/compositions";
import { renderRound } from "../components/renderRound";

const argTypes = {
  composition: {
    options: Object.keys(compositions),
    control: { type: "select" },
  },
};

export default {
  title: "Example/Rounds",
  tags: ["autodocs"],
  render: ({ eventType, outcomes, randomWinningSide, ...args }) => {
    const composition = compositions[args.composition || "Basic"];
    const { matchUps } = generateMatchUps({
      ...args,
      randomWinningSide,
      drawSize: 16,
      eventType,
      outcomes,
    });
    const content = renderRound({
      ...args,
      roundNumber: 1,
      composition,
      matchUps,
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes,
};

export const Singles = {
  args: {
    isLucky: true,
  },
};

export const Doubles = {
  args: {
    eventType: "DOUBLES",
    isLucky: true,
  },
};
