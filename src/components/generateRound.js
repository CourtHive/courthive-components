// import { MatchUp } from "../MatchUp/MatchUp";
import { css } from "@stitches/core";

export const generateRound = ({
  // selectedMatchUpId,
  // eventHandlers,
  // searchActive,
  composition,
  roundNumber,
  matchUps,
  // isLucky,
}) => {
  const roundMatchUps = (matchUps || [])
    .filter((matchUp) => matchUp.roundNumber === roundNumber)
    .sort((a, b) => (a.roundPosition || 0) - (b.roundPosition || 0));

  const roundStyle = css({
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    marginInlineStart: "16px",
    marginInlineEnd: "16px",
    width: "460px",
  });

  const content = roundMatchUps
    .map((matchUp) => matchUp.score?.scoreStringSide1 || "Score")
    .join("");

  const div = document.createElement("div");
  div.className = roundStyle;
  if (composition?.theme) div.classList.append(composition.theme);

  div.innerHTML = content;

  return div;
};