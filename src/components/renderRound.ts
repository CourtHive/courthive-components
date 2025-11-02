import { groupSeparatorStyle } from '../styles/groupSeparatorStyle';
import { roundContainerStyle } from '../styles/roundContainerStyle';
import { groupNameStyle } from '../styles/groupNameStyle';
import { renderRoundHeader } from './renderRoundHeader';
import { roundStyle } from '../styles/roundStyle';
import { tools } from 'tods-competition-factory';
import { renderMatchUp } from './renderMatchUp';
import { isFunction } from './modal/cmodal';
import type { Composition, EventHandlers, MatchUp } from '../types';

export function renderRound({
  initialRoundNumber = 1,
  selectedMatchUpId,
  eventHandlers,
  isFinalRound,
  isRoundRobin,
  searchActive,
  composition,
  roundFactor,
  roundNumber,
  roundProfile,
  minWidth,
  matchUps,
  context,
  isLucky
}: {
  initialRoundNumber?: number;
  selectedMatchUpId?: string;
  eventHandlers?: EventHandlers;
  isFinalRound?: boolean;
  isRoundRobin?: boolean;
  searchActive?: boolean;
  composition?: Composition;
  roundFactor?: number;
  roundNumber: number;
  roundProfile?: any;
  minWidth?: string;
  matchUps: MatchUp[];
  context?: any;
  isLucky?: boolean;
}): HTMLElement {
  const roundMatchUps = matchUps
    .filter((matchUp) => matchUp.roundNumber === roundNumber)
    .sort((a, b) => (a.roundPosition || 0) - (b.roundPosition || 0));

  const isAdHoc = roundMatchUps.every(({ roundPosition, drawPositions }) => !roundPosition && !drawPositions);

  const configuration = composition?.configuration || {};

  const roundContainer = document.createElement('div');
  roundContainer.className = roundContainerStyle();

  roundContainer.classList.add('tmx-rd');
  roundContainer.setAttribute('roundNumber', String(roundNumber));

  if (configuration.roundHeader) {
    const header = renderRoundHeader({ roundProfile, roundMatchUps, roundNumber, eventHandlers, context });
    roundContainer.appendChild(header);
  }

  const div = document.createElement('div');
  div.className = roundStyle({ variant: isAdHoc ? 'adHoc' : undefined });
  if (minWidth) div.style.minWidth = minWidth;

  let structureNames;
  let structureIds;
  let groupsCount;
  if (isRoundRobin) {
    const sum = (arr?: number[]) => (arr || []).reduce((sum, val) => val + sum, 0);
    roundMatchUps.sort((a, b) => {
      const sumDiff = sum(a.drawPositions) - sum(b.drawPositions);
      const aPositions = a.drawPositions || [];
      const bPositions = b.drawPositions || [];
      const minDiff = (aPositions.length ? Math.min.apply(null, aPositions) : 0) - (bPositions.length ? Math.min.apply(null, bPositions) : 0);
      return sumDiff || minDiff;
    });
    const structureDetails = roundMatchUps.reduce((obj, matchUp) => {
      obj[matchUp.structureId] = matchUp.structureName;
      return obj;
    }, {});
    structureNames = Object.values(structureDetails);
    structureIds = Object.keys(structureDetails);
    groupsCount = Object.keys(tools.instanceCount(roundMatchUps.map(({ structureId }) => structureId))).length;
  } else if (isAdHoc) {
    roundMatchUps.sort((a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0));
  }
  const per = groupsCount && roundMatchUps.length / groupsCount;

  const roundNumbers = Object.keys(roundProfile).map((k) => parseInt(k));
  const roundIndex = roundNumbers.indexOf(roundNumber);
  const roundOrder = (roundIndex === 0 && 'first') || (roundIndex === roundNumbers.length - 1 && 'last');

  roundMatchUps.forEach((matchUp, i) => {
    const rrGroupSepator = per && !(i % per);
    const groupIndex = per && Math.floor(i / per);
    const rrGroupName = per && structureNames[groupIndex];

    if (rrGroupSepator) {
      const separator = document.createElement('div');
      separator.className = groupSeparatorStyle({ 
        ...(groupIndex === 0 && { variant: 0 }), 
        ...(roundOrder && { roundOrder })
      });
      div.appendChild(separator);

      const groupName = document.createElement('div');
      groupName.className = groupNameStyle();
      if (isFunction(eventHandlers?.groupHeaderClick)) {
        const { drawId, containerStructureId } = roundMatchUps[0];
        div.onclick = (pointerEvent) =>
          eventHandlers.groupHeaderClick({
            structureId: structureIds[groupIndex],
            containerStructureId,
            pointerEvent,
            drawId
          });
      }
      if (roundNumber === initialRoundNumber) groupName.innerHTML = rrGroupName;
      div.appendChild(groupName);
    }

    const moiety = i % 2 === 0;
    if (roundFactor) {
      matchUp.roundFactor = roundFactor;
    } else if (initialRoundNumber > 1) {
      matchUp.roundFactor = Math.pow(2, roundNumber - initialRoundNumber);
    }
    const m = renderMatchUp({
      initialRoundNumber,
      selectedMatchUpId,
      eventHandlers,
      isFinalRound,
      searchActive,
      composition,
      isAdHoc,
      isLucky,
      matchUp,
      moiety
    });
    div.appendChild(m);
  });

  roundContainer.appendChild(div);

  return roundContainer;
}
