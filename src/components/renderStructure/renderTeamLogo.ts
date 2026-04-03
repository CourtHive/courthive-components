import { teamLogoStyle } from '../../styles/teamLogoStyle';
import { getTeamLogo, hashString } from '../../assets/team-logos';

export function renderTeamLogo({ participantId }: { teamLogo?: any; participantId?: string }): HTMLElement {
  const div = document.createElement('div');
  div.className = teamLogoStyle();

  const index = participantId ? hashString(participantId) : Math.floor(Math.random() * 8);
  const logo = getTeamLogo(index);

  const img = document.createElement('img');
  img.src = logo.src;
  img.alt = logo.name;
  img.style.cssText = 'height: 100%; width: auto; object-fit: contain;';
  div.appendChild(img);

  return div;
}
