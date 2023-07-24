import { teamLogoStyle } from "../styles/teamLogoStyle";

export function renderTeamLogo({ teamLogo }) {
  console.log({ teamLogo });
  const div = document.createElement("div");
  div.className = teamLogoStyle();
  return div;
}
