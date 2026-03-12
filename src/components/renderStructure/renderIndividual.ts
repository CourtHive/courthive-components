import { getPlacholderStyle, participantNameStyle, participantStyle } from '../../styles/participantStyle';
import { drawDefinitionConstants, genderConstants, entryStatusConstants } from 'tods-competition-factory';
import { renderParticipantDetail } from './renderParticipantDetail';
import { renderParticipantInput } from './renderParticipantInput';
import { seedStyle } from '../../styles/seedStyle';
import { renderFrill } from './renderFrill';
import { isFunction } from '../modal/cmodal';
import type { Composition, EventHandlers, IndividualParticipant, MatchUp, Side } from '../../types';

const { FEED_IN } = drawDefinitionConstants;
const { MALE, FEMALE } = genderConstants;
const { LUCKY_LOSER } = entryStatusConstants;

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
  div.setAttribute('sideNumber', String(sideNumber));
  div.setAttribute('id', individualParticipant?.participantId);

  div.onclick = handleOnClick;

  const individual = document.createElement('div');
  individual.className = participantStyle({ variant });

  const flags = configuration?.flags;
  const hasScale = configuration?.scaleAttributes;
  const scalePosition = flags ? 'left' : (configuration?.scaleAttributes?.scalePosition || 'left');
  const flag = flags && renderFrill({ ...params, type: 'flag' });
  if (flag) {
    individual.appendChild(flag);
  } else if (scalePosition === 'left') {
    const scale = renderFrill({
      type: 'scale',
      ...params
    });
    if (scale) individual.appendChild(scale);
  }
  const name = document.createElement('div');
  name.className = participantNameStyle({ variant });

  // Check if inline assignment is enabled
  const isFirstRound = matchUp?.roundNumber === 1;

  // For feed-in draws: check if this specific side is a feed-in position (can be any round)
  // A feed-in position has a drawPosition but no sourceMatchUp (doesn't come from previous round)
  const isFeedInSide =
    matchUp?.drawType === FEED_IN &&
    matchUp?.roundNumber > 1 && // Not first round (already covered)
    side?.drawPosition &&
    !side?.sourceMatchUp; // No source means it's a direct feed-in position

  const isAssignablePosition = isFirstRound || isFeedInSide;

  // In persist mode, BYE should also be assignable (can change BYE to participant)
  const persistMode = configuration?.persistInputFields;
  
  const canAssign =
    configuration?.inlineAssignment &&
    isFunction(eventHandlers?.assignParticipant) &&
    isFunction(configuration?.participantProvider) &&
    isAssignablePosition && // Only first round or feed-in sides
    (!side?.bye || persistMode) && // In persist mode, BYE can be reassigned
    (!side?.qualifier || persistMode); // In persist mode, QUALIFIER can be reassigned

  // Determine whether to show input field or participant name/BYE/QUALIFIER
  const shouldShowInput = canAssign && matchUp && (
    !participantName || // No participant assigned yet
    side?.bye || // BYE assigned (in persist mode, since canAssign checks persistMode)
    side?.qualifier || // QUALIFIER assigned (in persist mode, since canAssign checks persistMode)
    persistMode // Or persistInputFields mode is enabled
  );

  if (shouldShowInput) {
    // Render typeahead input for participant assignment
    // In persist mode, if BYE or QUALIFIER is assigned, pass a special marker
    let currentAssignment;
    if (side?.bye) {
      currentAssignment = { participantId: '__BYE__', participantName: '— BYE —' };
    } else if (side?.qualifier) {
      currentAssignment = { participantId: '__QUALIFIER__', participantName: '— QUALIFIER —' };
    } else {
      currentAssignment = individualParticipant;
    }
    
    const inputField = renderParticipantInput({
      matchUp,
      side,
      sideNumber,
      eventHandlers,
      composition,
      currentParticipant: currentAssignment, // Pass current assignment (BYE or participant)
    });
    name.appendChild(inputField);
  } else if (participantName) {
    // Show participant name (normal mode)
    const span = document.createElement('span');
    if (isWinningSide && configuration?.winnerColor) {
      span.style.color = typeof configuration.winnerColor === 'string' ? configuration.winnerColor : 'green';
    } else if (configuration?.genderColor) {
      const gender = individualParticipant?.person?.sex;
      const color =
        (gender === MALE && 'var(--chc-gender-male, #2E86C1)') ||
        (gender === FEMALE && 'var(--chc-gender-female, #E07BAF)') ||
        '';
      span.style.color = typeof configuration.genderColor === 'string' ? configuration.genderColor : color;
    }
    span.innerHTML = participantName;
    name.appendChild(span);

    // Lucky loser badge — two variants:
    // 1. luckyAdvancement: re-entered after losing in a lucky draw (orange bordered box)
    // 2. entryStatus LUCKY_LOSER without luckyAdvancement: qualifying lucky loser (solid orange text)
    if (side?.participant?.luckyAdvancement) {
      const ll = document.createElement('span');
      ll.className = 'chc-lucky-advancement-badge';
      ll.textContent = 'LL';
      name.appendChild(ll);
    } else if (side?.participant?.entryStatus === LUCKY_LOSER) {
      const ll = document.createElement('span');
      ll.className = 'chc-lucky-loser-badge';
      ll.textContent = 'LL';
      name.appendChild(ll);
    }
  } else {
    // Render placeholder (TBD/Qualifier/BYE)
    const placeholder = document.createElement('abbr');
    // if { showAddress: true } pad placeholder
    placeholder.className = getPlacholderStyle({ variant: configuration?.showAddress ? 'showAddress' : '' });
    placeholder.innerHTML =
      (side?.bye && placeHolders.BYE) || (side?.qualifier && placeHolders.QUALIFIER) || placeHolders.TBD;
    name.appendChild(placeholder);
  }

  // Place scale after the name when: flags+scale combo, or explicit right position
  if (hasScale && (flag || scalePosition === 'right')) {
    const scale = renderFrill({
      type: 'scale',
      ...params
    });
    if (scale) {
      scale.style.marginInlineStart = '0.5em';
      scale.style.marginInlineEnd = '0';
      name.appendChild(scale);
    }
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
