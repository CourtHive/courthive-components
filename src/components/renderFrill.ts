import { renderSeeding } from './renderSeeding';
import { renderScale } from './renderScale';
import { renderFlag } from './renderFlag';
import type { Composition, IndividualParticipant, MatchUp, Side } from '../types';

export function renderFrill({ 
  individualParticipant, 
  composition, 
  className, 
  matchUp, 
  spacer, 
  side, 
  type 
}: { 
  individualParticipant?: IndividualParticipant; 
  composition?: Composition; 
  className?: string; 
  matchUp?: MatchUp; 
  spacer?: boolean; 
  side?: Side; 
  type?: string 
}): HTMLElement {
  if (type === 'scale') {
    return renderScale({
      individualParticipant,
      composition,
      className,
      matchUp,
      spacer
    });
  }

  const configuration = composition?.configuration || {};

  const div = document.createElement('div');

  if (type === 'flag' && configuration.flags) {
    return renderFlag({ matchUp, individualParticipant, spacer });
  }
  
  if (type === 'seeding') {
    const seedingElement = renderSeeding({ className, composition, side });
    return typeof seedingElement === 'string' ? div : seedingElement;
  }

  return div;
}
