import { scaleStyle } from '../styles/scaleStyle';
import cx from 'classnames';
import type { Composition, IndividualParticipant, MatchUp } from '../types';

export function renderScale({ individualParticipant, composition, className, matchUp, spacer }: { 
  individualParticipant?: IndividualParticipant; 
  composition?: Composition; 
  className?: string; 
  matchUp?: MatchUp; 
  spacer?: boolean 
}): HTMLElement {
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
  const scaleColor = configuration?.scaleAttributes?.scaleColor;
  const validColor = (scaleColor === 'green' || scaleColor === 'red') ? scaleColor : undefined;
  if (value) span.className = cx(className, scaleStyle(validColor ? { color: validColor } : {}));
  span.innerHTML = value || '';

  return span;
}
