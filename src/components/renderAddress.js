import { participantStyle } from '../styles/participantStyle';
import { addressStyle } from '../styles/addressStyle';
import { renderFrill } from './renderFrill';
import cx from 'classnames';

export function renderAddress({ individualParticipant, composition, className, matchUp }) {
  const showAddress = composition?.configuration?.showAddress;
  const address = individualParticipant?.person?.addresses?.length
    ? Object.values(individualParticipant.person?.addresses?.[0] || {}).join(', ')
    : ' ';

  if (!showAddress) {
    return document.createElement('div');
  }

  const scale = composition?.configuration?.scaleAttributes;
  const flags = composition?.configuration?.flags;

  const div = document.createElement('div');
  if (flags || scale) {
    div.className = participantStyle();
    const frill = renderFrill({
      type: flags ? 'flag' : 'scale',
      individualParticipant,
      spacer: true,
      composition,
      className,
      matchUp
    });
    div.appendChild(frill);
    const addrDiv = document.createElement('div');
    addrDiv.className = cx(addressStyle(), className);
    addrDiv.innerHTML = address;
    div.appendChild(addrDiv);
  } else {
    div.className = cx(addressStyle(), className);
    div.innerHTML = address;
  }

  return div;
}
