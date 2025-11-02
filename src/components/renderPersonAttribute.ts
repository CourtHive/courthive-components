import { participantDetailStyle } from '../styles/participantDetailStyle';
import { getAttr } from '../helpers/getAttr';
import cx from 'classnames';
import type { IndividualParticipant } from '../types';

export function renderPersonAttribute({ 
  individualParticipant, 
  attribute, 
  className 
}: { 
  individualParticipant?: IndividualParticipant; 
  attribute: string; 
  className?: string 
}): HTMLElement | string {
  const person = individualParticipant?.person;
  const value = getAttr({ element: person, attr: attribute });
  if (!value) return '';

  const div = document.createElement('div');

  div.className = cx(participantDetailStyle(), className);
  div.innerHTML = value;

  return div;
}
