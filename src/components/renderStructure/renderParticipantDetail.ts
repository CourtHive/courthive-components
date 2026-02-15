import { renderAddress } from './renderAddress';
import { renderPersonAttribute } from './renderPersonAttribute';
import { renderTeam } from './renderTeam';
import type { Composition, IndividualParticipant } from '../../types';

export function renderParticipantDetail(params: {
  composition?: Composition;
  individualParticipant?: IndividualParticipant;
  className?: string;
  [key: string]: any;
}): HTMLElement {
  const participantDetail = params?.composition?.configuration?.participantDetail;

  const showTeam = participantDetail === 'TEAM';
  if (showTeam) return renderTeam(params);

  const showAddress = params?.composition?.configuration?.showAddress ?? participantDetail === 'ADDRESS';
  if (showAddress) return renderAddress(params);

  if (participantDetail) {
    const personDetail = renderPersonAttribute({ ...params, attribute: participantDetail });
    if (personDetail && typeof personDetail !== 'string') {
      return personDetail;
    }
  }

  return document.createElement('div');
}
