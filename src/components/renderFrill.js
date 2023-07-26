import { renderSeeding } from './renderSeeding';
import { renderScale } from './renderScale';
import { renderFlag } from './renderFlag';

export function renderFrill({ individualParticipant, composition, className, matchUp, spacer, side, type }) {
  if (type === 'scale')
    return renderScale({
      individualParticipant,
      composition,
      className,
      matchUp,
      spacer
    });

  const configuration = composition?.configuration || {};

  const div = document.createElement('div');

  return (
    (type === 'flag' && configuration.flags && renderFlag({ className, matchUp, individualParticipant, spacer })) ||
    (type === 'seeding' && renderSeeding({ className, composition, matchUp, side })) ||
    div
  );
}
