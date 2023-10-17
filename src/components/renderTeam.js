import { participantDetailStyle } from '../styles/participantDetailStyle';
import cx from 'classnames';

export function renderTeam({ individualParticipant, className }) {
  const team = individualParticipant?.teams?.[0];
  const teamName = team?.participantName || ' ';

  const div = document.createElement('div');
  div.className = cx(participantDetailStyle(), className);

  div.classList.add('tmx-tm');
  div.setAttribute('id', team?.participantId);
  div.innerHTML = teamName;

  return div;
}
