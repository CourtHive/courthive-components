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
  centerInfoClick: () => console.log('centerInfo click'),
  participantClick: ({ individualParticipant, matchUp, side }) => {
    console.log({ individualParticipant, matchUp, side });
  },
  scheduleClick: () => console.log('schedule click'),
  scoreClick: ({ matchUp }) => {
    if (!matchUp.readyToScore && !matchUp.winningSide) return;
    const composition = {
      configuration: { bracketedSeeds: 'square', flags: true, showAddress: true }
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
  venueClick: () => console.log('venue click')
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

    const content = renderStructure({
      ...args,
      eventHandlers,
      composition,
      matchUps
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
  args: { drawSize: 16, participantsCount: 14, completeAllMatchUps: false, composition: 'National' }
};
export const Qualifying = {
  args: { drawSize: 16, participantsCount: 14, addQualifying: true }
};
export const Team = {
  args: {
    completeAllMatchUps: false,
    eventType: 'TEAM',
    drawSize: 4
  }
};
export const RoundRobin = {
  args: { drawSize: 16, drawType: 'ROUND_ROBIN', composition: 'National' }
};
export const AdHoc = {
  args: { drawSize: 16, drawType: 'AD_HOC', composition: 'National' }
};
