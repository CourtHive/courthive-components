import { mocksEngine, tournamentEngine, drawDefinitionConstants, matchUpStatusConstants } from 'tods-competition-factory';

const { FEED_IN, ROUND_ROBIN, AD_HOC, LUCKY_DRAW } = drawDefinitionConstants;
const { COMPLETED } = matchUpStatusConstants;
import { renderParticipant } from '../components/renderStructure/renderParticipant';
import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderStructure } from '../components/renderStructure/renderStructure';
import { generateEventData } from '../data/generateEventData';
import { renderField } from '../components/forms/renderField';
import { compositions } from '../compositions/compositions';
import { cModal } from '../components/modal/cmodal';
import '../components/forms/styles';

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

  const finalColumn = args.drawType === AD_HOC && buttonColumn;

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

    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display: flex; gap: 12px; padding: 8px 12px; align-items: center; flex-wrap: wrap;';

    // Draw size input
    const { field: drawSizeField, inputElement: drawSizeInput } = renderField({
      label: 'Draw Size',
      field: 'drawSize',
      type: 'number',
      value: String(args.drawSize),
      width: '100px',
      validator: (v: string) => {
        const n = Number(v);
        return Number.isInteger(n) && n >= 16 && n <= 64;
      },
      error: '16–64'
    });
    toolbar.appendChild(drawSizeField);

    // Round buttons container (populated by rebuild)
    const roundButtons = document.createElement('div');
    roundButtons.style.cssText = 'display: flex; gap: 6px; align-items: center;';
    toolbar.appendChild(roundButtons);

    wrapper.appendChild(toolbar);

    const drawContainer = document.createElement('div');
    wrapper.appendChild(drawContainer);

    let currentDrawSize = args.drawSize;
    let currentRound = 1;

    const activeStyle = (active: boolean) =>
      `padding: 4px 10px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 13px; background: ${
        active ? '#3273dc' : ''
      }; color: ${active ? '#fff' : ''}`;

    const roundLabel = (round: number, last: number): string => {
      const fromEnd = last - round;
      if (fromEnd === 0) return `R${round} (F)`;
      if (fromEnd === 1) return `R${round} (SF)`;
      if (fromEnd === 2) return `R${round} (QF)`;
      return `R${round}`;
    };

    const rebuild = () => {
      const composition = compositions[args.composition || 'Australian'];
      const genArgs = { ...args, drawSize: currentDrawSize, participantsCount: currentDrawSize };
      const eventData = generateEventData(genArgs)?.eventData;
      const structure = eventData?.drawsData?.[0]?.structures?.[0];
      const roundMatchUps = structure?.roundMatchUps;
      const matchUps = roundMatchUps ? Object.values(roundMatchUps).flat() : [];
      const roundNumbers = roundMatchUps
        ? Object.keys(roundMatchUps)
            .map(Number)
            .sort((a, b) => a - b)
        : [];
      const lastRound = roundNumbers.at(-1) || 1;

      if (!roundNumbers.includes(currentRound)) currentRound = roundNumbers[0] || 1;

      // Round buttons
      roundButtons.innerHTML = '';
      const label = document.createElement('span');
      label.textContent = 'Start from:';
      label.style.cssText = 'font-weight: 600;';
      roundButtons.appendChild(label);

      roundNumbers.forEach((rn) => {
        const btn = document.createElement('button');
        btn.textContent = roundLabel(rn, lastRound);
        btn.style.cssText = activeStyle(rn === currentRound);
        btn.onclick = () => {
          currentRound = rn;
          rebuild();
        };
        roundButtons.appendChild(btn);
      });

      // Render
      drawContainer.innerHTML = '';
      const context = { structureId: structure?.structureId, drawId: eventData?.drawsData?.[0]?.drawId };
      const content = renderStructure({
        initialRoundNumber: currentRound,
        eventHandlers,
        composition,
        matchUps: matchUps as any,
        context
      });
      drawContainer.appendChild(renderContainer({ theme: composition.theme, content }));
    };

    if (drawSizeInput) {
      (drawSizeInput as HTMLInputElement).addEventListener('change', () => {
        const val = Number((drawSizeInput as HTMLInputElement).value);
        if (Number.isInteger(val) && val >= 16 && val <= 64) {
          currentDrawSize = val;
          currentRound = 1;
          rebuild();
        }
      });
    }

    rebuild();
    return wrapper;
  },
  args: {
    completeAllMatchUps: false,
    drawType: FEED_IN,
    composition: 'National',
    drawSize: 32
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
  args: { drawSize: 16, drawType: ROUND_ROBIN, composition: 'National' }
};
export const AdHoc = {
  args: { drawSize: 16, drawType: AD_HOC, composition: 'National', automated: true }
};
export const Lucky = {
  args: { drawSize: 10, drawType: LUCKY_DRAW, composition: 'National' },
  render: ({ ...args }) => {
    const composition = compositions[args.composition || 'National'];
    const drawSize = args.drawSize || 10;

    // Generate tournament with LUCKY_DRAW but don't complete matchUps automatically
    const { tournamentRecord, drawIds, eventIds } = mocksEngine.generateTournamentRecord({
      drawProfiles: [{ drawSize, drawType: LUCKY_DRAW, seedsCount: 0 }],
      completeAllMatchUps: false
    });
    const drawId = drawIds[0];
    const eventId = eventIds[0];
    tournamentEngine.setState(tournamentRecord);

    const { drawDefinition } = tournamentEngine.getEvent({ drawId });
    const structureId = drawDefinition.structures[0].structureId;

    // Get round structure to process rounds sequentially
    const { matchUps: allMatchUps } = tournamentEngine.allTournamentMatchUps();
    const drawMatchUps = allMatchUps.filter((m: any) => m.drawId === drawId);
    const roundNumbers = Array.from(new Set(drawMatchUps.map((m: any) => m.roundNumber))).sort(
      (a: any, b: any) => a - b
    );

    // Process each round: score matchUps, then advance (with lucky loser selection for pre-feed rounds)
    for (const roundNumber of roundNumbers) {
      // Get current matchUps for this round
      const { matchUps: currentMatchUps } = tournamentEngine.allTournamentMatchUps();
      const roundMatchUps = currentMatchUps
        .filter((m: any) => m.drawId === drawId && m.roundNumber === roundNumber)
        .filter((m: any) => m.drawPositions?.every(Boolean)); // Only score matchUps with assigned positions

      if (!roundMatchUps.length) break;

      // Score all matchUps in this round
      for (const matchUp of roundMatchUps) {
        const { outcome } = mocksEngine.generateOutcomeFromScoreString({
          matchUpStatus: COMPLETED,
          scoreString: '6-3 6-4',
          winningSide: 1
        });
        tournamentEngine.setMatchUpStatus({
          matchUpId: matchUp.matchUpId,
          outcome,
          drawId
        });
      }

      // Check if this round needs lucky advancement (skip final round — no next round to advance to)
      if (roundNumber === roundNumbers.at(-1)) continue;

      const status = tournamentEngine.getLuckyDrawRoundStatus({ drawId });
      const roundStatus = status.rounds?.find((r: any) => r.roundNumber === roundNumber);

      if (roundStatus?.needsLuckySelection && roundStatus.eligibleLosers?.length) {
        // Select the loser with the narrowest margin (first in sorted list)
        const selectedLoser = roundStatus.eligibleLosers[0];
        tournamentEngine.luckyDrawAdvancement({
          participantId: selectedLoser.participantId,
          roundNumber,
          structureId,
          drawId
        });
      } else if (roundStatus?.isComplete) {
        // Non-pre-feed completed round still needs advancement for position assignment
        tournamentEngine.luckyDrawAdvancement({
          roundNumber,
          structureId,
          drawId
        });
      }
    }

    // Get hydrated event data (which includes entryStatus on participants)
    const { eventData } =
      tournamentEngine.getEventData({
        participantsProfile: { withIOC: true, withISO2: true, withScaleValues: true },
        eventId
      }) || {};

    const structures = eventData?.drawsData?.[0]?.structures || [];
    const structure = structures[0];
    const roundMatchUps = structure?.roundMatchUps;
    const matchUps = roundMatchUps ? Object.values(roundMatchUps).flat() : [];
    const context = { structureId: structure?.structureId, drawId };

    const content = renderStructure({
      eventHandlers,
      composition,
      matchUps: matchUps as any,
      context
    });
    return renderContainer({ theme: composition.theme, content });
  }
};
