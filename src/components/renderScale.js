import { scaleStyle } from '../styles/scaleStyle';
import cx from 'classnames';

export function renderScale({ individualParticipant, composition, className, matchUp, spacer }) {
  // allow configuration to override matchUpType in derivation of eventType

  const configuration = composition?.configuration;
  const eventType = configuration?.scaleAttributes?.eventType || matchUp?.matchUpType || 'SINGLES';
  const rankings = individualParticipant?.rankings;
  const ratings = individualParticipant?.ratings;

  const scaleAttributes = configuration?.scaleAttributes;
  const scaleType = scaleAttributes?.scaleType;
  const scaleName = scaleAttributes?.scaleName;
  const accessor = scaleAttributes?.accessor;

  const scale = scaleType === 'RATING' ? ratings : rankings;
  const singlesScaleValue = scale?.SINGLES?.find((item) => item?.scaleName === scaleName)?.scaleValue;
  const doublesScaleValue = scale?.DOUBLES?.find((item) => item?.scaleName === scaleName)?.scaleValue;
  const singlesValue = singlesScaleValue && accessor ? singlesScaleValue[accessor] : singlesScaleValue || '';
  const doublesValue = doublesScaleValue && accessor ? doublesScaleValue[accessor] : doublesScaleValue || '';
  const targetValue = eventType === 'SINGLES' ? singlesValue : doublesValue;

  const fallback = configuration?.scaleAttributes?.fallback;
  const value = !spacer && (targetValue || (fallback && (singlesValue || doublesValue)));

  const span = document.createElement('span');
  if (value) span.className = cx(className, scaleStyle({ color: configuration?.scaleAttributes?.scaleColor }));
  span.innerHTML = value || '';

  return span;
}
