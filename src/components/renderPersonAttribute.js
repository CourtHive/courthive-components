import { participantDetailStyle } from '../styles/participantDetailStyle';
import { getAttr } from '../helpers/getAttr';
import cx from 'classnames';

export function renderPersonAttribute({ individualParticipant, attribute, className }) {
  const person = individualParticipant?.person;
  const value = getAttr({ element: person, attr: attribute });
  if (!value) return;

  const div = document.createElement('div');

  div.className = cx(participantDetailStyle(), className);
  div.innerHTML = value;

  return div;
}
