import { scaleStyle } from '../styles/scaleStyle';
import cx from 'classnames';

export function renderScale({ individualParticipant, composition, className, matchUp, spacer }) {
  const matchUpType = matchUp?.matchUpType || 'SINGLES';
  const ratings = individualParticipant?.ratings?.[matchUpType];
  const rankings = individualParticipant?.rankings?.[matchUpType];
  const scaleAttributes = composition?.configuration?.scaleAttributes;
  const scaleType = scaleAttributes?.scaleType;
  const scaleName = scaleAttributes?.scaleName;
  const accessor = scaleAttributes?.accessor;

  const scale = scaleType === 'RATING' ? ratings : rankings;
  const scaleValue = !spacer && scale?.find((item) => item?.scaleName === scaleName)?.scaleValue;
  const value = scaleValue && accessor ? scaleValue[accessor] : scaleValue || '';

  const span = document.createElement('span');
  if (value) span.className = cx(className, scaleStyle());
  span.innerHTML = value || '';

  return span;
}
