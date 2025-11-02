import { getPlacholderStyle, participantNameStyle, participantStyle } from '../styles/participantStyle';
import { renderParticipantDetail } from './renderParticipantDetail';
import { seedStyle } from '../styles/seedStyle';
import { renderFrill } from './renderFrill';
import { isFunction } from './modal/cmodal';
import type { Composition, EventHandlers, IndividualParticipant, MatchUp, Side } from '../types';

const QUALIFIER = 'Qualifier';
const BYE = 'BYE';
const TBD = 'TBD';

export function renderIndividual(params: {
  isWinningSide?: boolean;
  side?: Side;
  sideNumber?: number;
  individualParticipant?: IndividualParticipant;
  matchUp?: MatchUp;
  composition?: Composition;
  eventHandlers?: EventHandlers;
}): { element: HTMLElement } {
  const { isWinningSide, side, sideNumber, individualParticipant, matchUp, composition } = params || {};
  const variant = isWinningSide ? 'winner' : undefined;
  const eventHandlers = params.eventHandlers || {};
  const configuration = composition?.configuration;

  const placeHolders = {
    QUALIFIER: configuration?.placeHolders?.qualifier || QUALIFIER,
    BYE: configuration?.placeHolders?.bye || BYE,
    TBD: configuration?.placeHolders?.tbd || TBD
  };

  const participantName = individualParticipant?.participantName;

  const handleOnClick = (pointerEvent) => {
    if (isFunction(eventHandlers?.participantClick)) {
      pointerEvent.stopPropagation();
      eventHandlers.participantClick({
        individualParticipant,
        pointerEvent,
        matchUp,
        side
      });
    }
  };

  const div = document.createElement('div');

  // event metadata
  div.classList.add('tmx-i');
  div.setAttribute('sideNumber', sideNumber);
  div.setAttribute('id', individualParticipant?.participantId);

  div.onclick = handleOnClick;

  const individual = document.createElement('div');
  individual.className = participantStyle({ variant });

  const flags = configuration?.flags;
  const flag = flags && renderFrill({ ...params, type: 'flag' });
  if (flag) {
    individual.appendChild(flag);
  } else {
    const scale = renderFrill({
      type: 'scale',
      ...params
    });
    if (scale) individual.appendChild(scale);
  }
  const name = document.createElement('div');
  name.className = participantNameStyle({ variant });

  if (participantName) {
    const span = document.createElement('span');
    if (isWinningSide && configuration?.winnerColor) {
      span.style.color = typeof configuration.winnerColor === 'string' ? configuration.winnerColor : 'green';
    } else if (configuration?.genderColor) {
      const gender = individualParticipant?.person?.sex;
      const color = (gender === 'MALE' && '#2E86C1') || (gender === 'FEMALE' && '#AA336A') || '';
      span.style.color = typeof configuration.genderColor === 'string' ? configuration.genderColor : color;
    }
    span.innerHTML = participantName;
    name.appendChild(span);
  } else {
    const placeholder = document.createElement('abbr');
    // if { showAddress: true } pad placeholder
    placeholder.className = getPlacholderStyle({ variant: configuration.showAddress ? 'showAddress' : '' });
    placeholder.innerHTML =
      (side?.bye && placeHolders.BYE) || (side?.qualifier && placeHolders.QUALIFIER) || placeHolders.TBD;
    name.appendChild(placeholder);
  }

  const seeding = renderFrill({
    ...params,
    className: seedStyle(),
    type: 'seeding'
  });
  if (seeding) name.appendChild(seeding);

  individual.appendChild(name);
  div.appendChild(individual);

  const participantDetail = renderParticipantDetail(params);
  div.appendChild(participantDetail);

  return { element: div };
}
