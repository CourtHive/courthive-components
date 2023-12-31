import { renderAddress } from './renderAddress';
import { renderTeam } from './renderTeam';

export function renderParticipantDetail(params) {
  const participantDetail = params?.composition?.configuration?.participantDetail;
  const showAddress = params?.composition?.configuration?.showAddress ?? participantDetail === 'ADDRESS';
  if (showAddress) return renderAddress(params);

  const showTeam = participantDetail === 'TEAM';
  if (showTeam) return renderTeam(params);

  return document.createElement('div');
}
