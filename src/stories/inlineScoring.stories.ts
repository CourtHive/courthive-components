/**
 * Inline Scoring Stories
 *
 * Demonstrates the InlineScoringManager and renderInlineMatchUp components,
 * showing how matchUps in a draw bracket can be scored interactively via
 * point-by-point or game-by-game modes.
 *
 * Includes stories for:
 * - Single matchUp scoring (point/game modes)
 * - Multiple matchUps sharing one manager
 * - Mixed matchUp states (ready-to-score, completed, not-yet-ready)
 * - Full draw structure with partial completion
 * - Composition editor: what happens when any composition enters inline scoring mode
 */

import { matchUpStatusConstants, mocksEngine, queryGovernor } from 'tods-competition-factory';
import { renderInlineMatchUp } from '../components/inline-scoring/renderInlineMatchUp';
import { InlineScoringManager } from '../components/inline-scoring/inlineScoringManager';
import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderStructure } from '../components/renderStructure/renderStructure';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Composition, MatchUp } from '../types';

const { IN_PROGRESS, COMPLETED } = matchUpStatusConstants;

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
    onSubmit: ({ matchUpId, matchUp }: any) =>
      console.log('[InlineScoring] Submit:', matchUpId, matchUp?.score),
  };
}

export default {
  title: 'Components/Inline Scoring',
};

function generateSampleMatchUps(count = 3): MatchUp[] {
  const tournamentRecord = mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 8, generate: true, eventName: 'Singles' }],
    participantsProfile: { withScaleValues: true },
  }).tournamentRecord;

  const allMatchUps = queryGovernor.allTournamentMatchUps({ tournamentRecord }).matchUps ?? [];
  return allMatchUps
    .filter((m: any) => m.matchUpType === 'SINGLES' && m.sides?.length === 2)
    .slice(0, count)
    .map((m: any) => ({
      ...m,
      matchUpStatus: IN_PROGRESS,
      readyToScore: true,
      matchUpFormat: STANDARD_ADVANTAGE,
    }));
}

function makeComposition(baseName: string, mode: 'points' | 'games'): Composition {
  const base = compositions[baseName] || compositions['Australian'];
  return {
    ...base,
    configuration: {
      ...base.configuration,
      matchUpFooter: true,
      gameScore: { position: 'trailing', inverted: true },
      inlineScoring: {
        mode,
        showFooter: true,
      },
    },
  };
}

/** Wraps content in a max-width div inside renderContainer, matching matchUp.stories pattern. */
function storyWrap(theme: string | undefined, content: HTMLElement): HTMLElement {
  const inner = document.createElement('div');
  inner.style.maxWidth = '500px';
  inner.appendChild(content);
  return renderContainer({ theme, content: inner });
}

// ── Point-by-Point Mode ─────────────────────────────────────

export const PointByPoint = {
  args: { composition: 'InlineScoring' },
  argTypes: {
    composition: {
      options: Object.keys(compositions),
      control: { type: 'select' },
    },
  },
  render: (args: any) => {
    const composition = makeComposition(args.composition || 'InlineScoring', 'points');
    const matchUps = generateSampleMatchUps(1);
    const matchUp = matchUps[0];
    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = NO_MATCHUPS;
      return el;
    }

    const manager = new InlineScoringManager(makeCallbacks());

    const outer = document.createElement('div');

    const info = document.createElement('p');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'Click score numbers to award a point. LIVE chip opens end-match popover. Footer has Undo/Redo/Clear/Submit.';
    outer.appendChild(info);

    const rendered = renderInlineMatchUp({
      matchUp,
      composition,
      manager,
      matchUpFormat: STANDARD_ADVANTAGE,
      isLucky: true,
    });

    outer.appendChild(storyWrap(composition.theme, rendered));
    return outer;
  },
};

// ── Game-by-Game Mode ────────────────────────────────────────

export const GameByGame = {
  args: { composition: 'InlineScoring' },
  argTypes: {
    composition: {
      options: Object.keys(compositions),
      control: { type: 'select' },
    },
  },
  render: (args: any) => {
    const composition = makeComposition(args.composition || 'InlineScoring', 'games');
    const matchUps = generateSampleMatchUps(1);
    const matchUp = matchUps[0];
    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = NO_MATCHUPS;
      return el;
    }

    const manager = new InlineScoringManager(makeCallbacks());

    const outer = document.createElement('div');

    const info = document.createElement('p');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'Click score numbers to add a game. Each click = 1 game won.';
    outer.appendChild(info);

    const rendered = renderInlineMatchUp({
      matchUp,
      composition,
      manager,
      matchUpFormat: STANDARD_ADVANTAGE,
      isLucky: true,
    });

    outer.appendChild(storyWrap(composition.theme, rendered));
    return outer;
  },
};

// ── Multiple MatchUps (Draw Bracket Simulation) ─────────────

export const MultipleScoringMatchUps = {
  args: { composition: 'InlineScoring', mode: 'games' },
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
    const mode = args.mode || 'games';
    const composition = makeComposition(args.composition || 'InlineScoring', mode);
    const matchUps = generateSampleMatchUps();

    const manager = new InlineScoringManager(makeCallbacks());

    const outer = document.createElement('div');

    const info = document.createElement('p');
    info.style.cssText = INFO_STYLE;
    info.textContent = `${matchUps.length} matchUps sharing one InlineScoringManager. Mode: ${mode}. Each has independent scoring state.`;
    outer.appendChild(info);

    const inner = document.createElement('div');
    inner.style.maxWidth = '500px';
    for (const matchUp of matchUps) {
      const rendered = renderInlineMatchUp({
        matchUp,
        composition,
        manager,
        matchUpFormat: STANDARD_ADVANTAGE,
        isLucky: true,
      });
      rendered.style.marginBottom = '12px';
      inner.appendChild(rendered);
    }
    outer.appendChild(renderContainer({ theme: composition.theme, content: inner }));

    return outer;
  },
};

// ── With Existing Score ─────────────────────────────────────

export const WithExistingScore = {
  args: { composition: 'InlineScoring' },
  argTypes: {
    composition: {
      options: Object.keys(compositions),
      control: { type: 'select' },
    },
  },
  render: (args: any) => {
    const composition = makeComposition(args.composition || 'InlineScoring', 'games');
    const matchUps = generateSampleMatchUps(1);
    const matchUp = matchUps[0];
    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = NO_MATCHUPS;
      return el;
    }

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

    const info = document.createElement('p');
    info.style.cssText = INFO_STYLE;
    info.textContent = 'MatchUp starts with existing score 6-4, 3-2. Click game scores to add games.';
    outer.appendChild(info);

    const rendered = renderInlineMatchUp({
      matchUp,
      composition,
      manager,
      matchUpFormat: STANDARD_ADVANTAGE,
      isLucky: true,
    });

    outer.appendChild(storyWrap(composition.theme, rendered));
    return outer;
  },
};

// ── Mixed States (ready, completed, not-yet-ready) ──────────

export const MixedStates = {
  args: { composition: 'InlineScoring' },
  argTypes: {
    composition: {
      options: Object.keys(compositions),
      control: { type: 'select' },
    },
  },
  render: (args: any) => {
    const composition = makeComposition(args.composition || 'InlineScoring', 'games');
    const matchUps = generateSampleMatchUps(4);

    const outer = document.createElement('div');

    const info = document.createElement('p');
    info.style.cssText = INFO_STYLE;
    info.innerHTML = 'Mixed matchUp states (game-by-game mode):<br>1. Ready to score (LIVE chip, 0-0)<br>2. Completed (6-4 6-3, tick mark)<br>3. Not yet ready (no sides assigned)<br>4. Retired mid-match (status pill)';
    outer.appendChild(info);

    const manager = new InlineScoringManager(makeCallbacks());
    const inner = document.createElement('div');
    inner.style.maxWidth = '500px';

    // 1. Ready to score — standard inline scoring
    const readyMatchUp = matchUps[0];
    if (readyMatchUp) {
      readyMatchUp.readyToScore = true;
      readyMatchUp.matchUpStatus = IN_PROGRESS;
      const el = renderInlineMatchUp({
        matchUp: readyMatchUp,
        composition,
        manager,
        matchUpFormat: STANDARD_ADVANTAGE,
        isLucky: true,
      });
      el.style.marginBottom = '12px';
      inner.appendChild(el);
    }

    // 2. Completed — shows tick, no LIVE chip
    const completedMatchUp = matchUps[1];
    if (completedMatchUp) {
      completedMatchUp.readyToScore = false;
      completedMatchUp.matchUpStatus = COMPLETED;
      completedMatchUp.winningSide = 1;
      completedMatchUp.score = {
        scoreStringSide1: '6-4 6-3',
        sets: [
          { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
          { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 },
        ],
      };
      const el = renderMatchUp({
        matchUp: completedMatchUp,
        composition,
        isLucky: true,
      });
      el.style.marginBottom = '12px';
      inner.appendChild(el);
    }

    // 3. Not yet ready — no sides, shows as placeholder
    const notReadyMatchUp = matchUps[2];
    if (notReadyMatchUp) {
      notReadyMatchUp.readyToScore = false;
      notReadyMatchUp.matchUpStatus = undefined;
      notReadyMatchUp.sides = [
        { sideNumber: 1 },
        { sideNumber: 2 },
      ];
      const el = renderMatchUp({
        matchUp: notReadyMatchUp,
        composition,
        isLucky: true,
      });
      el.style.marginBottom = '12px';
      inner.appendChild(el);
    }

    // 4. Retired mid-match — status pill shown
    const retiredMatchUp = matchUps[3];
    if (retiredMatchUp) {
      retiredMatchUp.readyToScore = false;
      retiredMatchUp.matchUpStatus = 'RETIRED';
      retiredMatchUp.winningSide = 1;
      retiredMatchUp.score = {
        scoreStringSide1: '6-4 2-1',
        sets: [
          { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
          { setNumber: 2, side1Score: 2, side2Score: 1 },
        ],
      };
      const el = renderMatchUp({
        matchUp: retiredMatchUp,
        composition,
        isLucky: true,
      });
      el.style.marginBottom = '12px';
      inner.appendChild(el);
    }

    outer.appendChild(renderContainer({ theme: composition.theme, content: inner }));
    return outer;
  },
};

// ── Composition Editor: Inline Scoring Mode ─────────────────

export const CompositionInlineScoringMode = {
  args: {
    baseComposition: 'Australian',
  },
  argTypes: {
    baseComposition: {
      options: Object.keys(compositions).filter((k) => k !== 'InlineScoring'),
      control: { type: 'select' },
      description: 'Select a base composition to see how it looks when inline scoring is activated',
    },
  },
  render: (args: any) => {
    const baseName = args.baseComposition || 'Australian';
    const base = compositions[baseName];
    const matchUps = generateSampleMatchUps(2);

    const outer = document.createElement('div');

    const info = document.createElement('p');
    info.style.cssText = INFO_STYLE;
    info.innerHTML = `<strong>${baseName}</strong> composition — normal vs inline scoring mode side by side. Inline scoring adds: LIVE chip, 0-0 scores, clickable scores, footer buttons, and suppresses [Score] text.`;
    outer.appendChild(info);

    const inner = document.createElement('div');
    inner.style.maxWidth = '500px';

    // Normal rendering
    const normalLabel = document.createElement('h4');
    normalLabel.style.cssText = 'font-family:sans-serif; font-size:13px; margin:8px 0 4px;';
    normalLabel.textContent = `Normal (${baseName})`;
    inner.appendChild(normalLabel);

    const normalMatchUp = { ...matchUps[0], readyToScore: true, matchUpStatus: IN_PROGRESS };
    const normalEl = renderMatchUp({
      matchUp: normalMatchUp,
      composition: {
        ...base,
        configuration: { ...base.configuration, matchUpFooter: true },
      },
      isLucky: true,
      eventHandlers: {
        scoreClick: () => console.log('[Normal] scoreClick'),
      },
    });
    normalEl.style.marginBottom = '16px';
    inner.appendChild(normalEl);

    // Inline scoring rendering
    const inlineLabel = document.createElement('h4');
    inlineLabel.style.cssText = 'font-family:sans-serif; font-size:13px; margin:8px 0 4px;';
    inlineLabel.textContent = `Inline Scoring (${baseName} + inlineScoring config)`;
    inner.appendChild(inlineLabel);

    const inlineComposition = makeComposition(baseName, 'games');
    const inlineMatchUp = { ...matchUps[1], readyToScore: true, matchUpStatus: IN_PROGRESS };
    const manager = new InlineScoringManager(makeCallbacks());

    const inlineEl = renderInlineMatchUp({
      matchUp: inlineMatchUp,
      composition: inlineComposition,
      manager,
      matchUpFormat: STANDARD_ADVANTAGE,
      isLucky: true,
    });
    inner.appendChild(inlineEl);

    outer.appendChild(renderContainer({ theme: inlineComposition.theme, content: inner }));
    return outer;
  },
};

// ── Draw Structure with Partial Completion ────────────────────

export const DrawStructure = {
  args: { composition: 'InlineScoring' },
  argTypes: {
    composition: {
      options: Object.keys(compositions),
      control: { type: 'select' },
    },
  },
  render: (args: any) => {
    const composition = makeComposition(args.composition || 'InlineScoring', 'games');

    // Generate a 16-draw with 6 of 8 first-round matchUps completed.
    // completionGoal is a percentage: Math.floor(16 * 0.01 * 38) = 6
    const { eventData } = generateEventData({
      drawSize: 16,
      participantsCount: 16,
      completionGoal: 38,
      completeAllMatchUps: false,
      matchUpFormat: STANDARD_ADVANTAGE,
    });

    const structures = eventData?.drawsData?.[0]?.structures || [];
    const structure = structures[0];
    const roundMatchUps = structure?.roundMatchUps;
    const allMatchUps = (roundMatchUps ? Object.values(roundMatchUps).flat() : []) as MatchUp[];

    if (!allMatchUps.length) {
      const el = document.createElement('div');
      el.textContent = NO_MATCHUPS;
      return el;
    }

    // Identify ready-to-score matchUps: have two sides with participants and no winner
    const readyMatchUps = allMatchUps.filter((m: any) =>
      m.readyToScore && !m.winningSide && m.sides?.length === 2 &&
      m.sides[0]?.participant && m.sides[1]?.participant
    );

    // Mark ready-to-score matchUps as IN_PROGRESS for LIVE chip display
    for (const m of readyMatchUps) {
      (m as any).matchUpStatus = IN_PROGRESS;
    }

    const manager = new InlineScoringManager(makeCallbacks());
    const context = {
      structureId: structure?.structureId,
      drawId: eventData?.drawsData?.[0].drawId,
    };

    // First render the full structure (provides bracket layout with connectors)
    const structureEl = renderStructure({
      composition,
      matchUps: allMatchUps as any,
      context,
    });

    // Now replace each ready-to-score matchUp element with an interactive
    // renderInlineMatchUp wrapper that has its own re-render loop + engine
    const readyIds = new Set(readyMatchUps.map((m: any) => m.matchUpId));
    for (const matchUp of readyMatchUps) {
      const mId = (matchUp as any).matchUpId;
      const existing = structureEl.querySelector(`#${CSS.escape(mId)}`);
      if (!existing?.parentElement) continue;

      const inlineEl = renderInlineMatchUp({
        matchUp: matchUp as MatchUp,
        composition,
        manager,
        matchUpFormat: STANDARD_ADVANTAGE,
      });

      // Preserve the original element's classes for bracket connector styling
      existing.parentElement.replaceChild(inlineEl, existing);
    }

    const outer = document.createElement('div');
    const info = document.createElement('p');
    info.style.cssText = INFO_STYLE;
    info.textContent = `Draw of 16: 6 first-round matchUps completed, ${readyIds.size} matchUps ready to score (LIVE). Later rounds are TBD.`;
    outer.appendChild(info);
    outer.appendChild(renderContainer({ theme: composition.theme, content: structureEl }));
    return outer;
  },
};
