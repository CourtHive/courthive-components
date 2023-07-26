import { sideContainerStyle, sideRowStyle } from "../styles/sideStyles";
import { scoreWrapperStyle } from "../styles/scoreWrapperStyle";
import { renderParticipant } from "./renderParticipant";
import { utilities } from "tods-competition-factory";
import { renderSideScore } from "./renderSideScore";
import { renderSchedule } from "./renderSchedule";
import cx from "classnames";

export function renderSide({
  eventHandlers,
  composition,
  sideNumber,
  className,
  matchUp,
}) {
  const configuration = composition?.configuration || {};
  const scheduleInfo = configuration?.scheduleInfo;

  const hasScore = matchUp?.score?.scoreStringSide1;
  const scoreBox = composition?.configuration?.scoreBox && hasScore;
  const readyToScore =
    matchUp?.readyToScore &&
    eventHandlers.scoreClick &&
    !utilities.scoreHasValue({ matchUp });

  const div = document.createElement("div");
  div.className = cx(sideContainerStyle(), className);

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

  if (readyToScore) {
    const scoringStyle = scoreWrapperStyle();
    const handleScoreClick = (event) => {
      if (typeof eventHandlers?.scoreClick === "function") {
        event.stopPropagation();
        eventHandlers.scoreClick({ event, matchUp });
      }
    };
    const score = document.createElement("div");
    score.className = scoringStyle({
      sideNumber: !scoreBox && sideNumber,
      fontSize: "small",
    });
    score.onclick = handleScoreClick;
    score.innerHTML = `[Score]`;
    sideRow.appendChild(score);
  }

  div.appendChild(sideRow);

  return div;
}
