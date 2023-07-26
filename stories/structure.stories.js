import { renderContainer } from "../components/renderContainer";
import { renderStructure } from "../components/renderStructure";
import { generateEventData } from "../data/generateEventData";
import { compositions } from "../compositions/compositions";

const argTypes = {
  composition: {
    options: Object.keys(compositions),
    control: { type: "select" },
  },
};

export default {
  title: "Draws/Structure",
  tags: ["autodocs"],
  render: ({ randomWinningSide, roundNumber = 1, outcomes, ...args }) => {
    const composition = compositions[args.composition || "Basic"];

    const { eventData } = generateEventData({ ...args }) || {};

    const structures = eventData?.drawsData?.[0]?.structures || [];
    const initialStructureId = structures[0]?.structureId;
    const structure = structures?.find(
      (structure) => structure.structureId === initialStructureId
    );
    const roundMatchUps = structure?.roundMatchUps;
    const matchUps = roundMatchUps ? Object.values(roundMatchUps)?.flat() : [];

    const content = renderStructure({
      ...args,
      composition,
      matchUps,
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes,
};

export const Singles = {
  args: { drawSize: 16, participantsCount: 14, completionGoal: 40 },
};
export const Doubles = {
  args: { drawSize: 16, participantsCount: 14, eventType: "DOUBLES" },
};
