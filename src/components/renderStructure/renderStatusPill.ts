import { pillStyle } from '../../styles/pillStyle';

import { matchUpStatusConstants } from 'tods-competition-factory';

const { WALKOVER, DEFAULTED, DOUBLE_WALKOVER, DOUBLE_DEFAULT, ABANDONED, IN_PROGRESS, DEAD_RUBBER } =
  matchUpStatusConstants;

/** Abbreviations that are not simply the first three letters of the status. */
const STATUS_LABELS: Record<string, string> = {
  [WALKOVER]: 'WO',
  [DOUBLE_WALKOVER]: 'WO',
  [DEFAULTED]: 'DEF',
  [DOUBLE_DEFAULT]: 'DEF',
  [ABANDONED]: 'ABD',
  [DEAD_RUBBER]: 'DR',
  [IN_PROGRESS]: 'LIVE'
};

export function renderStatusPill({ matchUpStatus }: { matchUpStatus?: string }): HTMLElement {
  const variantValue = matchUpStatus?.toLowerCase();
  const validVariants = [
    'defaulted',
    'retired',
    'walkover',
    'defaulted',
    'double_walkover',
    'double_default',
    'cancelled',
    'in_progress',
    'awaiting_result',
    'dead_rubber',
    'incomplete',
    'suspended',
    'abandoned'
  ] as const;
  const variant = validVariants.includes(variantValue as any)
    ? (variantValue as (typeof validVariants)[number])
    : undefined;

  const statusText = STATUS_LABELS[matchUpStatus ?? ''] ?? (matchUpStatus?.split('_').join('').slice(0, 3) || '');

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
