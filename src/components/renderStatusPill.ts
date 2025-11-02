import { pillStyle } from "../styles/pillStyle";

export function renderStatusPill({ matchUpStatus }) {
  const variant = matchUpStatus?.toLowerCase();
  const statusText = ["WALKOVER", "DOUBLE_WALKOVER"].includes(matchUpStatus)
    ? "WO"
    : matchUpStatus?.slice(0, 3) || "";

  const div = document.createElement("div");
  div.className = pillStyle({ variant });

  const abbr = document.createElement("abbr");
  abbr.setAttribute("title", matchUpStatus);
  abbr.style.textDecoration = "none";
  abbr.style.borderBottom = "none";
  abbr.innerHTML = statusText;

  div.appendChild(abbr);

  return div;
}
