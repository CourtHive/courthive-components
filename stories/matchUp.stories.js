import { renderContainer } from "../components/renderContainer";
import { renderMatchUp } from "../components/renderMatchUp";
import { compositions } from "../compositions/compositions";
import { generateMatchUps } from "../data/generateMatchUps";

const argTypes = {
  composition: {
    options: Object.keys(compositions),
    control: { type: "select" },
  },
};

export default {
  title: "Example/MatchUps",
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
    const content = renderMatchUp({
      ...args,
      matchUp: matchUps[0],
      composition,
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
