import { participantDetailStyle } from '../styles/participantDetailStyle';
import cx from 'classnames';

export function renderAddress({ individualParticipant, className }) {
  const { city, state, countryCode } = individualParticipant?.person?.addresses?.[0] || {};
  const renderedAddress = [city, state, countryCode].filter(Boolean).join(', ') || ' ';

  const div = document.createElement('div');

  div.className = cx(participantDetailStyle(), className);
  div.innerHTML = renderedAddress;

  return div;
}
