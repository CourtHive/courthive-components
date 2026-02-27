/**
 * Stories demonstrating the roundVisibilityClick eye icon in round headers.
 * The eye icon appears when a roundVisibilityClick handler is provided.
 * Toggle between Light/Dark themes using the toolbar to verify icon visibility.
 *
 * The icon reflects `context.roundVisibilityState[roundNumber]`:
 * - Default: fa-eye, color:inherit, opacity 0.7
 * - Hidden (`hidden: true`): fa-eye-slash, red #e74c3c, opacity 0.85
 * - Embargoed (`embargoed: true`): fa-clock, orange #f39c12, opacity 0.85
 */
import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderStructure } from '../components/renderStructure/renderStructure';
import { generateEventData } from '../data/generateEventData';
import { renderRound } from '../components/renderStructure/renderRound';
import { generateMatchUps } from '../data/generateMatchUps';
import { compositions } from '../compositions/compositions';

const argTypes = {
  composition: {
    options: Object.keys(compositions),
    control: { type: 'select' }
  }
};

// Event handlers with roundVisibilityClick — triggers the eye icon display
const eventHandlersWithVisibility = {
  roundHeaderClick: (params) => console.log('round header click', params),
  roundVisibilityClick: (params) => {
    console.log('round visibility click', params);
    alert(`Round ${params.roundNumber} visibility clicked`);
  },
  scheduleClick: (params) => console.log('schedule click', params),
  venueClick: (params) => console.log('venue click', params)
};

// Event handlers WITHOUT roundVisibilityClick — no eye icon
const eventHandlersWithout = {
  roundHeaderClick: (params) => console.log('round header click', params),
  scheduleClick: (params) => console.log('schedule click', params),
  venueClick: (params) => console.log('venue click', params)
};

export default {
  title: 'Draws/Round Visibility',
  tags: ['autodocs']
};

/**
 * Shows the eye icon in each round header (default/visible state).
 * Click the eye icon to trigger roundVisibilityClick (alerts with round number).
 * Click the ⋮ icon to trigger roundHeaderClick (logs to console).
 * The eye icon uses `color: inherit` and adapts to the current theme.
 */
export const DefaultVisible = {
  render: ({ ...args }) => {
    const composition = compositions[args.composition || 'National'];
    const { matchUps } = generateMatchUps({ drawSize: 8, randomWinningSide: true });
    const content = renderRound({
      eventHandlers: eventHandlersWithVisibility,
      roundProfile: { 1: { roundName: 'Round 1' } },
      roundNumber: 1,
      composition,
      matchUps
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};

/**
 * Shows a round header WITHOUT the eye icon for comparison.
 * Only the ⋮ action icon appears.
 */
export const NoVisibilityHandler = {
  render: ({ ...args }) => {
    const composition = compositions[args.composition || 'National'];
    const { matchUps } = generateMatchUps({ drawSize: 8, randomWinningSide: true });
    const content = renderRound({
      eventHandlers: eventHandlersWithout,
      roundProfile: { 1: { roundName: 'Round 1' } },
      roundNumber: 1,
      composition,
      matchUps
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};

/**
 * Round header with a **hidden** round — red fa-eye-slash icon.
 * This is what an admin sees after hiding a round via roundLimit.
 */
export const HiddenRound = {
  render: ({ ...args }) => {
    const composition = compositions[args.composition || 'National'];
    const { matchUps } = generateMatchUps({ drawSize: 8, randomWinningSide: true });
    const context = {
      roundVisibilityState: { 1: { hidden: true } }
    };
    const content = renderRound({
      eventHandlers: eventHandlersWithVisibility,
      roundProfile: { 1: { roundName: 'Round 1' } },
      roundNumber: 1,
      composition,
      matchUps,
      context
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};

/**
 * Round header with an **embargoed** round — orange fa-clock icon.
 * This is what an admin sees when a schedule embargo is active on the round.
 */
export const EmbargoedRound = {
  render: ({ ...args }) => {
    const composition = compositions[args.composition || 'National'];
    const { matchUps } = generateMatchUps({ drawSize: 8, randomWinningSide: true });
    const context = {
      roundVisibilityState: { 1: { embargoed: true } }
    };
    const content = renderRound({
      eventHandlers: eventHandlersWithVisibility,
      roundProfile: { 1: { roundName: 'Round 1' } },
      roundNumber: 1,
      composition,
      matchUps,
      context
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};

/**
 * Round header where a round is **both hidden and embargoed**.
 * Hidden takes visual priority — red fa-eye-slash icon is shown.
 */
export const HiddenAndEmbargoed = {
  render: ({ ...args }) => {
    const composition = compositions[args.composition || 'National'];
    const { matchUps } = generateMatchUps({ drawSize: 8, randomWinningSide: true });
    const context = {
      roundVisibilityState: { 1: { hidden: true, embargoed: true } }
    };
    const content = renderRound({
      eventHandlers: eventHandlersWithVisibility,
      roundProfile: { 1: { roundName: 'Round 1' } },
      roundNumber: 1,
      composition,
      matchUps,
      context
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};

/**
 * Full elimination draw with eye icons in every round header (default state).
 * Uses the National composition (which enables round headers).
 */
export const EliminationDraw = {
  render: ({ ...args }) => {
    const composition = compositions[args.composition || 'National'];
    const { eventData } = generateEventData({ drawSize: 16, participantsCount: 14, completionGoal: 40, ...args }) || {};
    const structures = eventData?.drawsData?.[0]?.structures || [];
    const structure = structures[0];
    const roundMatchUps = structure?.roundMatchUps;
    const matchUps = roundMatchUps ? Object.values(roundMatchUps)?.flat() : [];
    const context = { structureId: structure?.structureId, drawId: eventData?.drawsData?.[0].drawId };

    const content = renderStructure({
      eventHandlers: eventHandlersWithVisibility,
      matchUps: matchUps as any,
      composition,
      context
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};

/**
 * AD_HOC draw with default eye icons — the primary use case for round visibility.
 * In TMX, clicking the eye icon on an AD_HOC draw shows options to hide/show rounds.
 */
export const AdHocDraw = {
  render: ({ ...args }) => {
    const composition = compositions[args.composition || 'National'];
    const { eventData } =
      generateEventData({ drawSize: 16, drawType: 'AD_HOC', automated: true, ...args }) || {};
    const structures = eventData?.drawsData?.[0]?.structures || [];
    const structure = structures[0];
    const roundMatchUps = structure?.roundMatchUps;
    const matchUps = roundMatchUps ? Object.values(roundMatchUps)?.flat() : [];
    const context = { structureId: structure?.structureId, drawId: eventData?.drawsData?.[0].drawId };

    const content = renderStructure({
      eventHandlers: eventHandlersWithVisibility,
      matchUps: matchUps as any,
      composition,
      context
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};

/**
 * AD_HOC draw with **mixed visibility states** across rounds.
 * - Round 1: default (visible) — fa-eye, theme color
 * - Round 2: embargoed — fa-clock, orange
 * - Round 3: hidden — fa-eye-slash, red
 */
export const AdHocMixedStates = {
  render: ({ ...args }) => {
    const composition = compositions[args.composition || 'National'];
    const { eventData } =
      generateEventData({ drawSize: 16, drawType: 'AD_HOC', automated: true, ...args }) || {};
    const structures = eventData?.drawsData?.[0]?.structures || [];
    const structure = structures[0];
    const roundMatchUps = structure?.roundMatchUps;
    const matchUps = roundMatchUps ? Object.values(roundMatchUps)?.flat() : [];
    const context = {
      structureId: structure?.structureId,
      drawId: eventData?.drawsData?.[0].drawId,
      roundVisibilityState: {
        2: { embargoed: true },
        3: { hidden: true }
      }
    };

    const content = renderStructure({
      eventHandlers: eventHandlersWithVisibility,
      matchUps: matchUps as any,
      composition,
      context
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};

/**
 * AD_HOC draw where **all rounds are hidden** (roundLimit = 0).
 * Every round header shows the red fa-eye-slash icon.
 */
export const AdHocAllHidden = {
  render: ({ ...args }) => {
    const composition = compositions[args.composition || 'National'];
    const { eventData } =
      generateEventData({ drawSize: 16, drawType: 'AD_HOC', automated: true, ...args }) || {};
    const structures = eventData?.drawsData?.[0]?.structures || [];
    const structure = structures[0];
    const roundMatchUps = structure?.roundMatchUps;
    const matchUps = roundMatchUps ? Object.values(roundMatchUps)?.flat() : [];
    const roundNumbers = Object.keys(roundMatchUps || {}).map(Number);
    const allHidden: Record<number, { hidden: boolean }> = {};
    for (const rn of roundNumbers) allHidden[rn] = { hidden: true };

    const context = {
      structureId: structure?.structureId,
      drawId: eventData?.drawsData?.[0].drawId,
      roundVisibilityState: allHidden
    };

    const content = renderStructure({
      eventHandlers: eventHandlersWithVisibility,
      matchUps: matchUps as any,
      composition,
      context
    });
    return renderContainer({ theme: composition.theme, content });
  },
  argTypes
};
