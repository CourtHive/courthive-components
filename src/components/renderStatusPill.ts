import { pillStyle } from '../styles/pillStyle';

import { matchUpStatusConstants } from 'tods-competition-factory';

const { WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT } = matchUpStatusConstants;

export function renderStatusPill({ matchUpStatus }: { matchUpStatus?: string }): HTMLElement {
  const variantValue = matchUpStatus?.toLowerCase();
  const validVariants = [
    'defaulted',
    'retired',
    'walkover',
    'defaulted',
    'cancelled',
    'in_progress',
    'awaiting_result',
    'dead_rubber',
    'incomplete',
    'suspended'
  ] as const;
  const variant = validVariants.includes(variantValue as any)
    ? (variantValue as (typeof validVariants)[number])
    : undefined;

  const statusText = [WALKOVER, DOUBLE_WALKOVER].includes(matchUpStatus || '')
    ? 'WO'
    : [DEFAULTED, DOUBLE_DEFAULT].includes(matchUpStatus || '')
    ? 'DEF'
    : matchUpStatus?.split('_').join('').slice(0, 3) || '';

  const div = document.createElement('div');
  div.className = pillStyle(variant ? { variant } : {});

  const abbr = document.createElement('abbr');
  abbr.setAttribute('title', matchUpStatus || '');
  abbr.style.textDecoration = 'none';
  abbr.style.borderBottom = 'none';
  abbr.innerHTML = statusText;

  div.appendChild(abbr);

  return div;
}
