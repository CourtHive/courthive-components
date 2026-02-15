import type { Composition, Side } from '../../types';

export function renderSeeding({ className, composition, side }: { className?: string; composition?: Composition; side?: Side }): HTMLElement | string {
  const seedValue =
    side?.seedValue === '~' ? '' : (side?.seedValue !== undefined && side.seedValue) || side?.seedNumber;

  if (!seedValue) return '';

  const configuration = composition?.configuration || {};
  const { bracketedSeeds } = configuration;

  const brackets: [string, string] = (typeof bracketedSeeds === 'boolean' && ['(', ')']) ||
    (bracketedSeeds === 'square' && ['[', ']']) || ['', ''];
  const seedDisplay = `${brackets[0]}${seedValue}${brackets[1]}`;

  const element = configuration.seedingElement === 'sup' ? 'sup' : 'span';
  const sup = document.createElement(element);
  sup.className = className || '';
  sup.innerHTML = seedDisplay;

  return sup;
}
