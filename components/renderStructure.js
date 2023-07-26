import { structureStyle } from "../styles/structureStyle";
import { drawEngine } from "tods-competition-factory";
import { renderRound } from "./renderRound";

export function renderStructure({
  selectedMatchUpId,
  eventHandlers,
  searchActive,
  composition,
  matchUps,
}) {
  const { roundNumbers, hasOddMatchUpsCount } = drawEngine.getRoundMatchUps({
    matchUps,
  });

  const isLucky = hasOddMatchUpsCount;

  const div = document.createElement("div");
  div.className = structureStyle();

  for (const roundNumber of roundNumbers) {
    const round = renderRound({
      selectedMatchUpId,
      eventHandlers,
      searchActive,
      composition,
      roundNumber,
      matchUps,
      isLucky,
    });
    div.appendChild(round);
  }

  return div;
}
