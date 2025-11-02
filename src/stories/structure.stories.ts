import { renderParticipant } from '../components/renderParticipant';
import { renderContainer } from '../components/renderContainer';
import { renderStructure } from '../components/renderStructure';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import { cModal } from '../components/modal/cmodal';

const argTypes = {
  composition: {
    options: Object.keys(compositions),
    control: { type: 'select' }
  }
};

const eventHandlers = {
  centerInfoClick: (params) => console.log('centerInfo click', params),
  participantClick: ({ individualParticipant, matchUp, side }) => {
    console.log({ individualParticipant, matchUp, side });
  },
  scheduleClick: (params) => console.log('schedule click', params),
  scoreClick: ({ matchUp }) => {
    if (!matchUp.readyToScore && !matchUp.winningSide) return;
    const composition = {
      configuration: {
        bracketedSeeds: 'square',
        showAddress: true,
        flags: true
      }
    };
    const participants = matchUp.sides.map(({ participant }) => participant);
    const content = renderParticipant({ participant: participants[0], matchUp, composition });
    cModal.open({
      buttons: [{ label: 'Ok', onClick: (p) => console.log(p) }],
      config: { backdrop: true, padding: '.5', clickAway: true },
      onClose: () => console.log('modal closed'),
      content
    });
  },
  groupHeaderClick: (params) => console.log('group header click', params),
  roundHeaderClick: (params) => console.log('round header click', params),
  venueClick: (params) => console.log('venue click', params)
};

export default {
  title: 'Draws/Structure',
  tags: ['autodocs'],
  render: ({ ...args }) => {
    const composition = compositions[args.composition || 'Australian'];

    const { eventData } = generateEventData({ ...args }) || {};

    const structures = eventData?.drawsData?.[0]?.structures || [];
    const initialStructureId = structures[0]?.structureId;
    const structure = structures?.find((structure) => structure.structureId === initialStructureId);
    const roundMatchUps = structure?.roundMatchUps;
    const matchUps = roundMatchUps ? Object.values(roundMatchUps)?.flat() : [];

    const context = { structureId: structure?.structureId, drawId: eventData?.drawsData?.[0].drawId };

    const buttonColumn = document.createElement('div');
    buttonColumn.style = 'display: flex; place-content: flex-start; height: 100%';
    const elem = document.createElement('button');
    elem.className = 'button font-medium is-info';
    elem.innerHTML = 'Generate Round';
    buttonColumn.appendChild(elem);

    const finalColumn = args.drawType === 'AD_HOC' && buttonColumn;

    const content = renderStructure({
      ...args,
      eventHandlers,
      composition,
      finalColumn,
      matchUps,
      context
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};

export const Singles = {
  args: { drawSize: 32, participantsCount: 14, completionGoal: 40 }
};
export const Doubles = {
  args: { drawSize: 16, participantsCount: 14, eventType: 'DOUBLES' }
};
export const National = {
  args: {
    completeAllMatchUps: false,
    composition: 'National',
    initialRoundNumber: 1,
    participantsCount: 14,
    drawSize: 16
  }
};
export const InitialRound = {
  args: {
    completeAllMatchUps: false,
    composition: 'National',
    initialRoundNumber: 2,
    participantsCount: 14,
    drawSize: 16
  }
};
export const Qualifying = {
  args: { drawSize: 16, participantsCount: 14, addQualifying: true }
};
export const Team = {
  args: {
    tieFormatName: 'DOMINANT_DUO',
    completeAllMatchUps: false,
    eventType: 'TEAM',
    drawSize: 4
  }
};
export const RoundRobin = {
  args: { drawSize: 16, drawType: 'ROUND_ROBIN', composition: 'National' }
};
export const AdHoc = {
  args: { drawSize: 16, drawType: 'AD_HOC', composition: 'National', automated: true }
};
