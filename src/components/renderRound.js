import { groupSeparatorStyle } from '../styles/groupSeparatorStyle';
import { roundContainerStyle } from '../styles/roundContainerStyle';
import { groupNameStyle } from '../styles/groupNameStyle';
import { renderRoundHeader } from './renderRoundHeader';
import { utilities } from 'tods-competition-factory';
import { roundStyle } from '../styles/roundStyle';
import { renderMatchUp } from './renderMatchUp';

export function renderRound({
  selectedMatchUpId,
  eventHandlers,
  isRoundRobin,
  searchActive,
  composition,
  roundFactor,
  roundNumber,
  roundProfile,
  matchUps,
  isLucky
}) {
  const roundMatchUps = matchUps
    .filter((matchUp) => matchUp.roundNumber === roundNumber)
    .sort((a, b) => (a.roundPosition || 0) - (b.roundPosition || 0));

  const configuration = composition?.configuration || {};

  const roundContainer = document.createElement('div');
  roundContainer.className = roundContainerStyle();

  if (configuration.roundHeader) {
    const header = renderRoundHeader({ roundProfile, roundNumber, eventHandlers });
    roundContainer.appendChild(header);
  }

  const div = document.createElement('div');
  div.className = roundStyle();

  let structureNames;
  let groupsCount;
  if (isRoundRobin) {
    const sum = (arr) => arr.reduce((sum, val) => val + sum, 0);
    roundMatchUps.sort((a, b) => sum(a.drawPositions) - sum(b.drawPositions));
    structureNames = Object.values(
      roundMatchUps.reduce((obj, matchUp) => {
        obj[matchUp.structureId] = matchUp.structureName;
        return obj;
      }, {})
    );
    groupsCount = Object.keys(utilities.instanceCount(roundMatchUps.map(({ structureId }) => structureId))).length;
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
      separator.className = groupSeparatorStyle({ variant: groupIndex, roundOrder });
      div.appendChild(separator);

      const groupName = document.createElement('div');
      groupName.className = groupNameStyle();
      if (roundNumber === 1) groupName.innerHTML = rrGroupName;
      div.appendChild(groupName);
    }

    const moeity = i % 2 === 0;
    if (roundFactor) matchUp.roundFactor = roundFactor;
    const m = renderMatchUp({
      selectedMatchUpId,
      eventHandlers,
      searchActive,
      composition,
      matchUp,
      isLucky,
      moeity
    });
    div.appendChild(m);
  });

  roundContainer.appendChild(div);

  return roundContainer;
}
