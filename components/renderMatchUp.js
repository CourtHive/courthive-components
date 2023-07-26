import { resultsInfoStyle, resultsItemStyle } from "../styles/resultStyles";
import { getSelectedMatchUpStyle } from "../styles/getSelectedMatchUpStyle";
import { matchUpContainerStyle } from "../styles/matchUpContainerStyle";
import { getMatchUpStyle } from "../styles/getMatchUpStyle";
import { renderCenterInfo } from "./renderCenterInfo";
import { getLinkStyle } from "../styles/getLinkStyle";
import { renderSide } from "./renderSide";
import cx from "classnames";

export function renderMatchUp(params) {
  const { composition, matchUp, moeity, selectedMatchUpId, searchActive } =
    params;
  const {
    roundFactor,
    roundNumber,
    finishingRound,
    matchUpType,
    preFeedRound,
    stage,
  } = matchUp;
  const qualifyingStage = stage === "QUALIFYING";
  const isFinalRound = parseInt(finishingRound) === 1;
  const isQualifying = stage === "QUALIFYING" && isFinalRound;

  const noProgression = !qualifyingStage && isFinalRound;
  const isFirstRound = parseInt(roundNumber) === 1;
  const isDoubles = matchUpType === "DOUBLES";
  const link =
    ((searchActive ||
      matchUp.isRoundRobin ||
      matchUp.collectionId ||
      params.isLucky) &&
      "mr") ||
    (noProgression && "noProgression") ||
    ((isQualifying || preFeedRound) && "m0") ||
    (moeity && "m1") ||
    "m2";
  const linkClass = getLinkStyle({ composition, isDoubles, roundFactor })({
    isFirstRound,
    link,
  });

  const configuration = composition?.configuration || {};
  const { resultsInfo, centerInfo } = configuration || {};

  const eventHandlers = params.eventHandlers || {};
  const handleOnClick = (event) => {
    if (typeof eventHandlers?.matchUpClick === "function") {
      eventHandlers.matchUpClick({ event, matchUp });
    }
  };

  const container = document.createElement("div");
  container.className = cx(
    composition.theme,
    params?.className,
    "matchup",
    matchUpContainerStyle()
  );
  container.onclick = handleOnClick;

  const component = document.createElement("div");
  // component.className = matchUpStyle();
  component.className = getMatchUpStyle({
    configuration: { matchUpHover: true },
  });

  const entryStatusDisplay = ({ sideNumber }) => {
    const entryStatus = matchUp?.sides
      .find((s) => s.sideNumber === sideNumber)
      ?.participant?.entryStatus?.replace("_", " ");

    const className = sideNumber === 2 && linkClass;

    return renderCenterInfo({
      eventHandlers,
      entryStatus,
      sideNumber,
      className,
    });
  };

  const side1 = renderSide({
    sideNumber: 1,
    eventHandlers,
    composition,
    matchUp,
  });
  const side2 = renderSide({
    className: !centerInfo && linkClass,
    sideNumber: 2,
    eventHandlers,
    composition,
    matchUp,
  });

  component.appendChild(side1);
  if (centerInfo) {
    component.appendChild(entryStatusDisplay({ sideNumber: 1 }));
    component.appendChild(entryStatusDisplay({ sideNumber: 2 }));
  }
  component.appendChild(side2);

  if (resultsInfo) {
    const info = renderResultsInfo({ score: matchUp.score });
    component.appendChild(info);
  }

  container.appendChild(component);

  if (selectedMatchUpId === matchUp.matchUpId) {
    const selected = document.createElement("div");
    selected.className = getSelectedMatchUpStyle();
    container.appendChild(selected);
  }

  return container;
}

function renderResultsInfo({ score }) {
  const sets = score?.sets
    ?.filter(Boolean)
    .sort((a, b) => (a.setNumber || 0) - (b.setNumber || 0));
  const finalSet = sets?.[sets.length - 1];
  const points = finalSet?.side1PointsScore || finalSet?.side2PointsScore;

  const div = document.createElement("div");
  div.className = resultsInfoStyle();

  if (points) {
    const pts = document.createElement("div");
    pts.className = resultsItemStyle({ variant: "points" });
    pts.innerHTML = "PTS";
    div.appendChild(pts);
  }

  for (const set of sets || []) {
    const setDiv = document.createElement("div");
    setDiv.setAttribute("key", set.setNumber);
    setDiv.className = resultsItemStyle({ variant: "set" });
    setDiv.innerHTML = set.setNumber;
    div.appendChild(setDiv);
  }

  return div;
}
