import { participantDetailStyle } from '../../styles/participantDetailStyle';
import cx from 'classnames';
import type { IndividualParticipant } from '../../types';

export function renderAddress({ 
  individualParticipant, 
  className 
}: { 
  individualParticipant?: IndividualParticipant; 
  className?: string 
}): HTMLElement {
  const { city, state, countryCode } = individualParticipant?.person?.addresses?.[0] || {};
  const renderedAddress = [city, state, countryCode].filter(Boolean).join(', ') || ' ';

  const div = document.createElement('div');

  div.className = cx(participantDetailStyle(), className);
  div.innerHTML = renderedAddress;

  return div;
}
