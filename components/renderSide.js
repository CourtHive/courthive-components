import { sideContainerStyle, sideRowStyle } from "../styles/sideStyles";
import { renderParticipant } from "./renderParticipant";
import { renderSideScore } from "./renderSideScore";
import { renderSchedule } from "./renderSchedule";

export function renderSide({
  eventHandlers,
  composition,
  sideNumber,
  matchUp,
}) {
  const configuration = composition?.configuration || {};
  const scheduleInfo = configuration?.scheduleInfo;

  const hasScore = matchUp?.score?.scoreStringSide1;
  const scoreBox = composition?.configuration?.scoreBox && hasScore;

  const div = document.createElement("div");
  div.className = sideContainerStyle();

  if (scheduleInfo && sideNumber === 1) {
    const schedule = renderSchedule({ matchUp });
    div.appendChild(schedule);
  }

  const sideRow = document.createElement("div");
  sideRow.className = sideRowStyle();

  const participant = renderParticipant({
    sideContainer: true,
    composition,
    sideNumber,
    matchUp,
  });

  sideRow.appendChild(participant);

  if (scoreBox) {
    const box = document.createElement("div");
    box.style.border = `1px solid lightgray`;
    sideRow.appendChild(box);
  }

  if (hasScore) {
    const sideScore = renderSideScore({
      eventHandlers,
      composition,
      sideNumber,
      matchUp,
    });
    sideRow.appendChild(sideScore);
  }

  div.appendChild(sideRow);

  return div;
}
