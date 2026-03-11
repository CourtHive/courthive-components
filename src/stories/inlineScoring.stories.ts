/**
 * Inline Scoring Stories
 *
 * Demonstrates the InlineScoringManager and renderInlineMatchUp components,
 * showing how matchUps in a draw bracket can be scored interactively via
 * point-by-point, game-by-game, or entry modes.
 */

import { matchUpStatusConstants, mocksEngine, queryGovernor } from 'tods-competition-factory';
import { renderInlineMatchUp } from '../components/inline-scoring/renderInlineMatchUp';
import { InlineScoringManager } from '../components/inline-scoring/inlineScoringManager';
import { renderContainer } from '../components/renderStructure/renderContainer';
import { compositions } from '../compositions/compositions';
import type { Composition, MatchUp } from '../types';

const { IN_PROGRESS } = matchUpStatusConstants;

const STANDARD_ADVANTAGE = 'SET3-S:6/TB7';
const NO_MATCHUPS = 'No matchUps generated';
const INFO_STYLE = 'font-size:12px; color:var(--chc-text-muted); margin-bottom:12px; font-family:sans-serif;';

function makeCallbacks() {
  return {
    onScoreChange: ({ matchUpId }: any) => console.log('[InlineScoring] Score changed:', matchUpId),
    onMatchComplete: ({ matchUpId, winningSide }: any) =>
      console.log('[InlineScoring] Match complete:', matchUpId, 'Winner: Side', winningSide),
    onEndMatch: ({ matchUpId, matchUpStatus }: any) =>
      console.log('[InlineScoring] End match:', matchUpId, matchUpStatus),
  };
}

export default {
  title: 'Components/Inline Scoring',
};

function generateSampleMatchUps(): MatchUp[] {
  const tournamentRecord = mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 4, generate: true, eventName: 'Singles' }],
    participantsProfile: { withScaleValues: true },
  }).tournamentRecord;

  const allMatchUps = queryGovernor.allTournamentMatchUps({ tournamentRecord }).matchUps ?? [];
  return allMatchUps
    .filter((m: any) => m.matchUpType === 'SINGLES' && m.sides?.length === 2)
    .slice(0, 3)
    .map((m: any) => ({
      ...m,
      matchUpStatus: IN_PROGRESS,
      matchUpFormat: STANDARD_ADVANTAGE,
    }));
}

function makeComposition(baseName: string, mode: 'points' | 'games' | 'entry'): Composition {
  const base = compositions[baseName] || compositions['Australian'];
  return {
    ...base,
    configuration: {
      ...base.configuration,
      gameScore: { position: 'trailing', inverted: true },
      inlineScoring: {
        mode,
        showFooter: true,
        showSituation: true,
      },
    },
  };
}

// ── Point-by-Point Mode ─────────────────────────────────────

export const PointByPoint = {
  args: { composition: 'Australian' },
  argTypes: {
    composition: {
      options: Object.keys(compositions),
      control: { type: 'select' },
    },
  },
  render: (args: any) => {
    const composition = makeComposition(args.composition || 'Australian', 'points');
    const matchUps = generateSampleMatchUps();
    const matchUp = matchUps[0];
    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = NO_MATCHUPS;
      return el;
    }

    const manager = new InlineScoringManager(makeCallbacks());

    const outer = document.createElement('div');
    outer.style.maxWidth = '500px';

    const info = document.createElement('p');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'Click on a participant name or score area to award a point. Use footer buttons for Undo/Redo/Clear.';
    outer.appendChild(info);

    const rendered = renderInlineMatchUp({
      matchUp,
      composition,
      manager,
      matchUpFormat: STANDARD_ADVANTAGE,
      isLucky: true,
    });

    const themed = renderContainer({ theme: composition.theme, content: rendered });
    outer.appendChild(themed);

    return outer;
  },
};

// ── Game-by-Game Mode ────────────────────────────────────────

export const GameByGame = {
  args: { composition: 'Australian' },
  argTypes: {
    composition: {
      options: Object.keys(compositions),
      control: { type: 'select' },
    },
  },
  render: (args: any) => {
    const composition = makeComposition(args.composition || 'Australian', 'games');
    const matchUps = generateSampleMatchUps();
    const matchUp = matchUps[0];
    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = NO_MATCHUPS;
      return el;
    }

    const manager = new InlineScoringManager(makeCallbacks());

    const outer = document.createElement('div');
    outer.style.maxWidth = '500px';

    const info = document.createElement('p');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'Click on a participant name or score area to add a game. Each click = 1 game won.';
    outer.appendChild(info);

    const rendered = renderInlineMatchUp({
      matchUp,
      composition,
      manager,
      matchUpFormat: STANDARD_ADVANTAGE,
      isLucky: true,
    });

    const themed = renderContainer({ theme: composition.theme, content: rendered });
    outer.appendChild(themed);

    return outer;
  },
};

// ── Multiple MatchUps (Draw Bracket Simulation) ─────────────

export const MultipleScoringMatchUps = {
  args: { composition: 'Australian', mode: 'points' },
  argTypes: {
    composition: {
      options: Object.keys(compositions),
      control: { type: 'select' },
    },
    mode: {
      options: ['points', 'games'],
      control: { type: 'radio' },
    },
  },
  render: (args: any) => {
    const mode = args.mode || 'points';
    const composition = makeComposition(args.composition || 'Australian', mode);
    const matchUps = generateSampleMatchUps();

    const manager = new InlineScoringManager(makeCallbacks());

    const outer = document.createElement('div');
    outer.style.maxWidth = '500px';

    const info = document.createElement('p');
    info.style.cssText = 'font-size:12px; color:var(--chc-text-muted); margin-bottom:16px; font-family:sans-serif;';
    info.textContent = `${matchUps.length} matchUps sharing one InlineScoringManager. Mode: ${mode}. Each has independent scoring state.`;
    outer.appendChild(info);

    for (const matchUp of matchUps) {
      const rendered = renderInlineMatchUp({
        matchUp,
        composition,
        manager,
        matchUpFormat: STANDARD_ADVANTAGE,
        isLucky: true,
      });
      const themed = renderContainer({ theme: composition.theme, content: rendered });
      themed.style.marginBottom = '12px';
      outer.appendChild(themed);
    }

    return outer;
  },
};

// ── With Existing Score ─────────────────────────────────────

export const WithExistingScore = {
  args: { composition: 'Australian' },
  argTypes: {
    composition: {
      options: Object.keys(compositions),
      control: { type: 'select' },
    },
  },
  render: (args: any) => {
    const composition = makeComposition(args.composition || 'Australian', 'points');
    const matchUps = generateSampleMatchUps();
    const matchUp = matchUps[0];
    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = NO_MATCHUPS;
      return el;
    }

    // Pre-set an existing score
    matchUp.score = {
      scoreStringSide1: '6-4 3-2',
      sets: [
        { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
        { setNumber: 2, side1Score: 3, side2Score: 2 },
      ],
    };
    matchUp.matchUpStatus = IN_PROGRESS;

    const manager = new InlineScoringManager(makeCallbacks());

    const outer = document.createElement('div');
    outer.style.maxWidth = '500px';

    const info = document.createElement('p');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'MatchUp starts with existing score 6-4, 3-2. ScoringEngine resumes from this state.';
    outer.appendChild(info);

    const rendered = renderInlineMatchUp({
      matchUp,
      composition,
      manager,
      matchUpFormat: STANDARD_ADVANTAGE,
      isLucky: true,
    });

    const themed = renderContainer({ theme: composition.theme, content: rendered });
    outer.appendChild(themed);

    return outer;
  },
};

// ── Entry Mode (Set Score Input Fields) ──────────────────

export const EntryMode = {
  args: { composition: 'Australian' },
  argTypes: {
    composition: {
      options: Object.keys(compositions),
      control: { type: 'select' },
    },
  },
  render: (args: any) => {
    const composition = makeComposition(args.composition || 'Australian', 'entry');
    const matchUps = generateSampleMatchUps();
    const matchUp = matchUps[0];
    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = NO_MATCHUPS;
      return el;
    }

    const manager = new InlineScoringManager(makeCallbacks());

    const outer = document.createElement('div');
    outer.style.maxWidth = '500px';

    const info = document.createElement('p');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'Entry mode: type set scores directly (e.g. 6-4). Tab between fields, Enter to submit a set.';
    outer.appendChild(info);

    const rendered = renderInlineMatchUp({
      matchUp,
      composition,
      manager,
      matchUpFormat: STANDARD_ADVANTAGE,
      isLucky: true,
    });

    const themed = renderContainer({ theme: composition.theme, content: rendered });
    outer.appendChild(themed);

    return outer;
  },
};
