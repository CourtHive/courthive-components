import { seedingBasisMarker, seedingBasisTitle } from './seedingBasis';
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

  if (!seedValue) return '';

  const configuration = composition?.configuration || {};
  const { bracketedSeeds } = configuration;

  const brackets: [string, string] = (typeof bracketedSeeds === 'boolean' && ['(', ')']) ||
    (bracketedSeeds === 'square' && ['[', ']']) || ['', ''];

  // Inside the seed's own brackets, so `[9]` becomes `[9†]` rather than growing the line. See
  // ./seedingBasis for why the on-screen bracket is marked where the printed one is not.
  const marked = configuration.seedingBasisMarker !== false;
  const marker = marked ? seedingBasisMarker(side?.seedingBasis) : '';
  const seedDisplay = `${brackets[0]}${seedValue}${marker}${brackets[1]}`;

  const element = configuration.seedingElement === 'sup' ? 'sup' : 'span';
  const sup = document.createElement(element);
  sup.className = className || '';
  sup.innerHTML = seedDisplay;

  const title = marked ? seedingBasisTitle(side?.seedingBasis) : undefined;
  if (title) sup.title = title;

  return sup;
}
