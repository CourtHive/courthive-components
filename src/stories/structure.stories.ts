import { renderParticipant } from '../components/renderStructure/renderParticipant';
import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderStructure } from '../components/renderStructure/renderStructure';
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
  participantClick: (params: any) => {
    console.log({ individualParticipant: params.individualParticipant, matchUp: params.matchUp, side: params.side });
  },
  scheduleClick: (params) => console.log('schedule click', params),
  scoreClick: ({ matchUp }) => {
    if (!matchUp.readyToScore && !matchUp.winningSide) return;
    const composition: any = {
      theme: 'default',
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
  roundVisibilityClick: (params) => console.log('round visibility click', params),
  venueClick: (params) => console.log('venue click', params)
};

function buildStructureView(args: any) {
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

  return { composition, matchUps, context, finalColumn, roundMatchUps };
}

export default {
  title: 'Draws/Structure',
  tags: ['autodocs'],
  render: ({ ...args }) => {
    const { composition, matchUps, context, finalColumn } = buildStructureView(args);

    const content = renderStructure({
      ...args,
      eventHandlers,
      composition,
      finalColumn,
      matchUps: matchUps as any,
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
  render: ({ ...args }) => {
    const wrapper = document.createElement('div');

    const { composition, matchUps, context, roundMatchUps } = buildStructureView(args);
    const totalRounds = roundMatchUps ? Object.keys(roundMatchUps).length : 1;

    // Round selector buttons
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display: flex; gap: 8px; padding: 8px 12px; align-items: center;';

    const label = document.createElement('span');
    label.textContent = 'Start from round:';
    label.style.cssText = 'font-weight: 600; margin-right: 4px;';
    toolbar.appendChild(label);

    const drawContainer = document.createElement('div');

    let currentRound = args.initialRoundNumber || 1;

    const renderDraw = (initialRoundNumber: number) => {
      drawContainer.innerHTML = '';
      const content = renderStructure({
        ...args,
        initialRoundNumber,
        eventHandlers,
        composition,
        matchUps: matchUps as any,
        context
      });
      drawContainer.appendChild(renderContainer({ theme: composition.theme, content }));
    };

    const roundNames = (round: number, total: number): string => {
      const fromEnd = total - round;
      if (fromEnd === 0) return `R${round} (F)`;
      if (fromEnd === 1) return `R${round} (SF)`;
      if (fromEnd === 2) return `R${round} (QF)`;
      return `R${round}`;
    };

    const buttons: HTMLButtonElement[] = [];
    for (let r = 1; r <= totalRounds; r++) {
      const btn = document.createElement('button');
      btn.textContent = roundNames(r, totalRounds);
      btn.style.cssText =
        'padding: 4px 12px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 13px;';
      const roundNum = r;
      btn.onclick = () => {
        currentRound = roundNum;
        buttons.forEach((b, i) => {
          b.style.background = i + 1 === currentRound ? '#3273dc' : '';
          b.style.color = i + 1 === currentRound ? '#fff' : '';
        });
        renderDraw(currentRound);
      };
      buttons.push(btn);
      toolbar.appendChild(btn);
    }

    wrapper.appendChild(toolbar);
    wrapper.appendChild(drawContainer);

    // Set initial active state and render
    buttons.forEach((b, i) => {
      b.style.background = i + 1 === currentRound ? '#3273dc' : '';
      b.style.color = i + 1 === currentRound ? '#fff' : '';
    });
    renderDraw(currentRound);

    return wrapper;
  },
  args: {
    completeAllMatchUps: false,
    composition: 'National',
    initialRoundNumber: 3,
    participantsCount: 60,
    drawSize: 64
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
export const Lucky = {
  args: { drawSize: 11, drawType: 'LUCKY_DRAW', composition: 'National' }
};
