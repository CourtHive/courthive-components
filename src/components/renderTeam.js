import { participantDetailStyle } from '../styles/participantDetailStyle';
import cx from 'classnames';

export function renderTeam({ individualParticipant, className }) {
  const team = individualParticipant?.teams?.[0]?.participantName || ' ';

  const div = document.createElement('div');
  div.className = cx(participantDetailStyle(), className);

  div.classList.add('tmx-tm');
  if (team?.participantId) {
    div.setAttribute('id', team.participantId);
  }
  div.innerHTML = team;

  return div;
}
