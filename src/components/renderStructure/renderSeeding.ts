import { seedingBasisMarker, seedingBasisTitle } from './seedingBasis';
import { entryStatusLabel } from './matchUpState';

// constants and types
import type { Composition, Side } from '../../types';

export function renderSeeding({
  className,
  composition,
  side
}: {
  className?: string;
  composition?: Composition;
  side?: Side;
}): HTMLElement | string {
  const seedValue =
    side?.seedValue === '~' ? '' : (side?.seedValue !== undefined && side.seedValue) || side?.seedNumber;

  const configuration = composition?.configuration || {};
  // configuration.entryStatus: `[1, WC]` inside the seed's brackets, or its own tag when there are none
  const entry = entryStatusLabel(side, configuration.entryStatus);
  if (!seedValue && !entry) return '';

  const { bracketedSeeds } = configuration;

  const brackets: [string, string] = (typeof bracketedSeeds === 'boolean' && ['(', ')']) ||
    (bracketedSeeds === 'square' && ['[', ']']) || ['', ''];

  // Inside the seed's own brackets, so `[9]` becomes `[9†]` rather than growing the line. See
  // ./seedingBasis for why the on-screen bracket is marked where the printed one is not.
  const marked = configuration.seedingBasisMarker !== false;
  const marker = marked ? seedingBasisMarker(side?.seedingBasis) : '';
  const bracketed = !!bracketedSeeds;
  const seedPart = seedValue ? `${seedValue}${marker}` : '';
  const entryPart = entry && bracketed ? `${seedPart ? ', ' : ''}${entry.abbr}` : '';
  const seedDisplay = seedPart || entryPart ? `${brackets[0]}${seedPart}${entryPart}${brackets[1]}` : '';

  const element = configuration.seedingElement === 'sup' ? 'sup' : 'span';
  const sup = document.createElement(element);
  sup.className = className || '';
  sup.innerHTML = seedDisplay;

  if (entry && !bracketed) {
    const tag = document.createElement('span');
    tag.className = 'chc-entry-status';
    tag.textContent = entry.abbr;
    tag.title = entry.name;
    sup.appendChild(tag);
  }

  const basisTitle = marked ? seedingBasisTitle(side?.seedingBasis) : undefined;
  const title = [basisTitle, entry && bracketed ? entry.name : undefined].filter(Boolean).join(' · ');
  if (title) sup.title = title;

  return sup;
}
