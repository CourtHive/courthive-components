import { fixtures } from 'tods-competition-factory';
import { flagStyle } from '../styles/flagStyle';

export function renderFlag({ matchUp, individualParticipant, spacer }) {
  // const alt = individualParticipant?.person?.nationalityCode || "";
  const nationalityCode = individualParticipant?.person?.iso2NationalityCode || '';

  const iocFlag = nationalityCode ? fixtures.countryToFlag(nationalityCode)?.slice(0, 4) : '';

  const span = document.createElement('span');
  const variant = matchUp?.matchUpType?.toLowerCase();
  if (!spacer) span.className = flagStyle({ variant });
  span.innerHTML = spacer ? '' : iocFlag;

  return span;
}
