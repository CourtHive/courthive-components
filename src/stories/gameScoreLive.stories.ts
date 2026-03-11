/**
 * Game Score — Live Playback Stories
 *
 * Demonstrates the `gameScore` configuration with real match data from MCP
 * fixtures, fed point-by-point through the factory's ScoringEngine. The
 * scoreboard updates after every point, showing live game scores (15-30,
 * AD-40, tiebreak points, etc.) with inverted broadcast-style coloring.
 *
 * Data flow:
 *   MCP fixture → ScoringEngine.addPoint() → getScore().pointDisplay
 *   → map to courthive-components MatchUp → renderMatchUp()
 */

import { scoreGovernor, matchUpStatusConstants } from 'tods-competition-factory';
import { getMatchUpFormatModal } from '../components/matchUpFormat/matchUpFormat';
import { renderContainer } from '../components/renderStructure/renderContainer';
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { compositions } from '../compositions/compositions';
import type { MatchUp, Composition } from '../types';
import mcpFixtures from '../data/mcpFixtures.json';

const { ScoringEngine } = scoreGovernor;

// ── CSS Constants ───────────────────────────────────────────────
const INFO_STYLE = 'font-size:12px; color:var(--chc-text-muted); margin-bottom:8px; font-family:sans-serif;';

// ── MCP fixture access ──────────────────────────────────────────
interface McpFixture {
  matchId: number;
  players: string[];
  points: Array<{
    winner: number;
    server: number;
    result: string;
    rallyLength: number;
    error: string | null;
    [key: string]: any;
  }>;
  [key: string]: any;
}

const fixtures = mcpFixtures as unknown as McpFixture[];

function getMcpFixture(matchIndex = 0): McpFixture {
  return fixtures[matchIndex % fixtures.length];
}

const { IN_PROGRESS, COMPLETED } = matchUpStatusConstants;

const UNFORCED_ERROR = 'Unforced Error';
const STANDARD_ADVANTAGE = 'SET3-S:6/TB7';

// ── MCP result → factory result mapping ──────────────────────────
const RESULT_MAP: Record<string, string> = {
  Ace: 'Ace',
  Winner: 'Winner',
  'Serve Winner': 'Serve Winner',
  'Unforced Error': UNFORCED_ERROR,
  Net: UNFORCED_ERROR,
  Out: UNFORCED_ERROR,
  'Forced Error': 'Forced Error',
  'Double Fault': 'Double Fault'
};

// ── Bridge: ScoringEngine state → courthive-components MatchUp ──

function engineToMatchUp(engine: any, fixture: { matchId?: number; players: string[] }): MatchUp {
  const score = engine.getScore();
  const isComplete = engine.isComplete();

  const sets = (score.sets || []).map((s: any, i: number) => ({
    setNumber: i + 1,
    side1Score: s.side1Score,
    side2Score: s.side2Score,
    side1TiebreakScore: s.side1TiebreakScore,
    side2TiebreakScore: s.side2TiebreakScore,
    winningSide: s.winningSide,
    // Inject current game point display into the active (unwon) set
    ...(score.pointDisplay &&
      !s.winningSide &&
      !isComplete && {
        side1PointsScore: score.pointDisplay[0],
        side2PointsScore: score.pointDisplay[1]
      })
  }));

  const winner = engine.getWinner();

  return {
    matchUpId: `live-${fixture.matchId || 0}`,
    matchUpType: 'SINGLES',
    structureId: 'live',
    matchUpStatus: isComplete ? COMPLETED : IN_PROGRESS,
    winningSide: winner ?? undefined,
    score: {
      sets,
      scoreStringSide1: engine.getScoreboard() || (engine.getPointCount() > 0 ? '0-0' : undefined)
    },
    sides: [
      {
        sideNumber: 1,
        participant: { participantId: 'p1', participantName: fixture.players[0] }
      },
      {
        sideNumber: 2,
        participant: { participantId: 'p2', participantName: fixture.players[1] }
      }
    ]
  };
}

// ── Simple playback controls (DOM) ──────────────────────────────

interface PlaybackState {
  engine: any;
  fixture: any;
  cursor: number;
  timer: ReturnType<typeof setInterval> | null;
  playing: boolean;
  onUpdate: () => void;
}

function createPlaybackControls(state: PlaybackState): HTMLElement {
  const bar = document.createElement('div');
  bar.style.cssText =
    'display:flex; gap:6px; align-items:center; padding:8px 12px; background:var(--chc-bg-secondary); border-radius:6px; margin-bottom:12px; flex-wrap:wrap; font-family:sans-serif; font-size:13px; color:var(--chc-text-primary);';

  const btn = (label: string, onclick: () => void, id?: string) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText =
      'padding:4px 10px; border:1px solid var(--chc-border-primary); border-radius:4px; background:var(--chc-bg-primary); color:var(--chc-text-primary); cursor:pointer; font-size:12px; font-family:inherit;';
    b.onclick = onclick;
    if (id) b.id = id;
    return b;
  };

  const playBtn = btn(
    'Play',
    () => {
      if (state.playing) {
        pause();
      } else {
        play();
      }
    },
    'play-btn'
  );

  const stepBackBtn = btn('Step Back', () => {
    pause();
    if (state.cursor > 0) {
      state.engine.undo();
      state.cursor--;
      refresh();
    }
  });

  const stepFwdBtn = btn('Step Fwd', () => {
    pause();
    feedNext();
  });

  const resetBtn = btn('Reset', () => {
    pause();
    state.engine.reset();
    state.cursor = 0;
    refresh();
  });

  const progress = document.createElement('span');
  progress.style.cssText = 'margin-left:8px; color:var(--chc-text-secondary); min-width:80px;';

  const scoreboard = document.createElement('span');
  scoreboard.style.cssText = 'margin-left:auto; font-weight:bold; color:var(--chc-text-primary);';

  bar.append(playBtn, stepBackBtn, stepFwdBtn, resetBtn, progress, scoreboard);

  function feedNext() {
    const points = state.fixture.points;
    if (state.cursor >= points.length) {
      pause();
      return;
    }
    const pt = points[state.cursor];
    state.engine.addPoint({
      winner: pt.winner,
      server: pt.server,
      result: RESULT_MAP[pt.result] || 'Winner',
      rallyLength: pt.rallyLength
    });
    state.cursor++;
    refresh();
  }

  function play() {
    state.playing = true;
    playBtn.textContent = 'Pause';
    state.timer = setInterval(() => {
      if (state.cursor >= state.fixture.points.length) {
        pause();
        return;
      }
      feedNext();
    }, 200);
  }

  function pause() {
    state.playing = false;
    playBtn.textContent = 'Play';
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  function refresh() {
    const total = state.fixture.points.length;
    progress.textContent = `${state.cursor} / ${total}`;
    scoreboard.textContent = state.engine.getPointCount() > 0 ? state.engine.getScoreboard() : '';
    stepBackBtn.disabled = state.cursor <= 0;
    state.onUpdate();
  }

  // Initial state
  refresh();

  return bar;
}

// ── Format button (launches matchUpFormat editor modal) ─────────

function createFormatButton({
  currentFormat,
  onFormatChange
}: {
  currentFormat: string;
  onFormatChange: (format: string) => void;
}): HTMLElement {
  const btn = document.createElement('button');
  btn.textContent = currentFormat;
  btn.style.cssText =
    'font-family:monospace; padding:4px 8px; cursor:pointer; border:1px solid var(--chc-border-primary); border-radius:4px; background:var(--chc-bg-secondary); color:var(--chc-text-primary); font-size:13px;';
  btn.title = 'Click to change match format';

  btn.onclick = () => {
    getMatchUpFormatModal({
      existingMatchUpFormat: currentFormat,
      callback: (format: string) => {
        if (format && format !== currentFormat) {
          onFormatChange(format);
        }
      }
    });
  };

  return btn;
}

// ── Story helpers ───────────────────────────────────────────────

function gameScoreComposition(
  compositionName: string,
  gameScoreConfig: { position?: 'leading' | 'trailing'; inverted?: boolean }
): Composition {
  const base = compositions[compositionName] || compositions['Australian'];
  return {
    ...base,
    configuration: { ...base.configuration, gameScore: gameScoreConfig }
  };
}

// ── Stories ─────────────────────────────────────────────────────

const argTypes = {
  composition: {
    options: Object.keys(compositions),
    control: { type: 'select' }
  },
  matchIndex: {
    options: {
      'Federer vs Djokovic': 0,
      'Federer vs Wawrinka': 1,
      'Djokovic vs Nadal': 2,
      'Schwartzman vs Cervantes': 3
    },
    control: 'select'
  }
};

export default {
  title: 'MatchUps/GameScore Live',
  tags: ['autodocs'],
  argTypes
};

// ── Shared render helper ─────────────────────────────────────────
function createRenderCurrentState(
  engine: InstanceType<typeof ScoringEngine>,
  fixture: McpFixture,
  matchUpContainer: HTMLElement,
  composition: Composition
): () => void {
  return () => {
    const matchUp = engineToMatchUp(engine, fixture);
    matchUpContainer.innerHTML = '';
    const rendered = renderMatchUp({ matchUp, composition, isLucky: true });
    const themed = renderContainer({ theme: composition.theme, content: rendered });
    matchUpContainer.appendChild(themed);
  };
}

/**
 * Live Playback — Points feed automatically from an MCP fixture.
 *
 * The scoreboard re-renders after every point. Game score boxes appear
 * with inverted colors (trailing position) showing the current point
 * score within the active game. Watch for deuce, advantage, tiebreak
 * points, and the game score disappearing when the match completes.
 */
export const LivePlayback = {
  args: { composition: 'Australian', matchIndex: 0 },
  render: (args: any) => {
    const composition = gameScoreComposition(args.composition || 'Australian', {
      position: 'trailing',
      inverted: true
    });
    const fixture = getMcpFixture(args.matchIndex || 0);
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_ADVANTAGE });

    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '550px';

    const matchUpContainer = document.createElement('div');
    const renderCurrentState = createRenderCurrentState(engine, fixture, matchUpContainer, composition);

    const state: PlaybackState = {
      engine,
      fixture,
      cursor: 0,
      timer: null,
      playing: false,
      onUpdate: renderCurrentState
    };

    const controls = createPlaybackControls(state);

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent = `${fixture.players[0]} vs ${fixture.players[1]} — ${fixture.points.length} points`;

    wrapper.append(info, controls, matchUpContainer);
    renderCurrentState();

    return wrapper;
  }
};

/**
 * Step Through — Manual point-by-point control.
 *
 * Use the Step Fwd / Step Back buttons to advance one point at a time.
 * Observe game score transitions: 0→15→30→40→Game, deuce sequences,
 * tiebreak point counting, and set transitions.
 */
export const StepThrough = {
  args: { composition: 'Australian', matchIndex: 0 },
  render: (args: any) => {
    const composition = gameScoreComposition(args.composition || 'Australian', {
      position: 'trailing',
      inverted: true
    });
    const fixture = getMcpFixture(args.matchIndex || 0);
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_ADVANTAGE });

    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '550px';

    const matchUpContainer = document.createElement('div');

    // Point detail panel
    const detailPanel = document.createElement('div');
    detailPanel.style.cssText =
      'font-family:monospace; font-size:12px; color:var(--chc-text-secondary); padding:8px; background:var(--chc-bg-secondary); border-radius:4px; margin-top:8px; min-height:2.5em;';

    function renderCurrentState() {
      const matchUp = engineToMatchUp(engine, fixture);
      matchUpContainer.innerHTML = '';
      const rendered = renderMatchUp({ matchUp, composition, isLucky: true });
      const themed = renderContainer({ theme: composition.theme, content: rendered });
      matchUpContainer.appendChild(themed);

      // Show point detail
      const score = engine.getScore();
      const sit = score.situation;
      const pointDisplay = score.pointDisplay ? score.pointDisplay.join('-') : '—';
      const flags = [
        sit?.isBreakPoint && 'BP',
        sit?.isGamePoint && 'GP',
        sit?.isSetPoint && 'SP',
        sit?.isMatchPoint && 'MP',
        sit?.isTiebreak && 'TB'
      ]
        .filter(Boolean)
        .join(' ');

      const lastPt = state.cursor > 0 ? fixture.points[state.cursor - 1] : null;
      const errorSuffix = lastPt?.error ? ` (${lastPt.error})` : '';
      const result = lastPt ? `${lastPt.result}${errorSuffix}` : '';

      detailPanel.textContent =
        engine.getPointCount() > 0
          ? `Points: ${pointDisplay}  |  ${result}  ${flags}`
          : 'No points played yet — click Step Fwd to begin';
    }

    const state: PlaybackState = {
      engine,
      fixture,
      cursor: 0,
      timer: null,
      playing: false,
      onUpdate: renderCurrentState
    };

    const controls = createPlaybackControls(state);

    const info = document.createElement('div');
    info.style.cssText = INFO_STYLE;
    info.textContent = `${fixture.players[0]} vs ${fixture.players[1]} — ${fixture.points.length} points`;

    wrapper.append(info, controls, matchUpContainer, detailPanel);
    renderCurrentState();

    return wrapper;
  }
};

/**
 * Leading Position — Game score boxes appear before set scores.
 *
 * Some broadcast styles place the live point score to the left of the
 * set scores. This story demonstrates `position: 'leading'`.
 */
export const LeadingPosition = {
  args: { composition: 'Australian', matchIndex: 0 },
  render: (args: any) => {
    const composition = gameScoreComposition(args.composition || 'Australian', {
      position: 'leading',
      inverted: true
    });
    const fixture = getMcpFixture(args.matchIndex || 0);
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_ADVANTAGE });

    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '550px';

    const matchUpContainer = document.createElement('div');
    const renderCurrentState = createRenderCurrentState(engine, fixture, matchUpContainer, composition);

    const state: PlaybackState = {
      engine,
      fixture,
      cursor: 0,
      timer: null,
      playing: false,
      onUpdate: renderCurrentState
    };

    const controls = createPlaybackControls(state);
    wrapper.append(controls, matchUpContainer);
    renderCurrentState();

    return wrapper;
  }
};

/**
 * All Compositions — Compare game score rendering across themes.
 *
 * Feeds 15 points from the first fixture, then renders the same matchUp
 * state in every available composition. Shows how game scores look in
 * Australian, Basic, French, Wimbledon, US Open, and ITF themes.
 */
export const AllCompositions = {
  args: { matchIndex: 0 },
  render: (args: any) => {
    const fixture = getMcpFixture(args.matchIndex || 0);
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_ADVANTAGE });

    // Feed enough points to get a meaningful score
    const pointCount = Math.min(15, fixture.points.length);
    for (let i = 0; i < pointCount; i++) {
      const pt = fixture.points[i];
      engine.addPoint({
        winner: pt.winner as 0 | 1,
        server: pt.server as 0 | 1,
        result: (RESULT_MAP[pt.result] || 'Winner') as any,
        rallyLength: pt.rallyLength
      });
    }

    const matchUp = engineToMatchUp(engine, fixture);
    const score = engine.getScore();
    const pointDisplay = score.pointDisplay ? score.pointDisplay.join('-') : '—';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex; flex-direction:column; gap:16px; max-width:550px;';

    const header = document.createElement('div');
    header.style.cssText = 'font-family:sans-serif; font-size:13px; color:var(--chc-text-secondary);';
    header.textContent = `${fixture.players[0]} vs ${fixture.players[1]} — ${pointCount} points fed — Game: ${pointDisplay}`;
    wrapper.appendChild(header);

    for (const [name, comp] of Object.entries(compositions)) {
      const composition: Composition = {
        ...comp,
        configuration: { ...comp.configuration, gameScore: { position: 'trailing', inverted: true } }
      };

      const label = document.createElement('div');
      label.style.cssText = 'font-family:sans-serif; font-size:11px; color:var(--chc-text-muted); margin-bottom:-8px;';
      label.textContent = name;
      wrapper.appendChild(label);

      const rendered = renderMatchUp({ matchUp, composition, isLucky: true });
      const themed = renderContainer({ theme: composition.theme, content: rendered });
      themed.style.maxWidth = '500px';
      wrapper.appendChild(themed);
    }

    return wrapper;
  }
};

/**
 * Not Inverted — Plain text game score, no background color.
 *
 * Demonstrates `inverted: false` for compositions that prefer subtle
 * game score display without the broadcast-style colored boxes.
 */
export const NotInverted = {
  args: { composition: 'Australian', matchIndex: 0 },
  render: (args: any) => {
    const composition = gameScoreComposition(args.composition || 'Australian', {
      position: 'trailing',
      inverted: false
    });
    const fixture = getMcpFixture(args.matchIndex || 0);
    const engine = new ScoringEngine({ matchUpFormat: STANDARD_ADVANTAGE });

    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '550px';

    const matchUpContainer = document.createElement('div');
    const renderCurrentState = createRenderCurrentState(engine, fixture, matchUpContainer, composition);

    const state: PlaybackState = {
      engine,
      fixture,
      cursor: 0,
      timer: null,
      playing: false,
      onUpdate: renderCurrentState
    };

    const controls = createPlaybackControls(state);
    wrapper.append(controls, matchUpContainer);
    renderCurrentState();

    return wrapper;
  }
};

/**
 * Fixture Playback — Replay fixture points under any match format.
 *
 * Plays back an MCP fixture point-by-point with step fwd/back controls.
 * The matchUpFormat code is shown as a clickable button that launches the
 * format editor modal. Changing the format creates a new ScoringEngine
 * instance, resets the cursor, and rebuilds the UI.
 */
export const FixturePlayback = {
  args: { composition: 'Australian', matchIndex: 0 },
  render: (args: any) => {
    const compositionName = args.composition || 'Australian';
    const fixture = getMcpFixture(args.matchIndex || 0);
    let currentFormat = STANDARD_ADVANTAGE;

    const outer = document.createElement('div');
    outer.style.maxWidth = '550px';

    function buildUI() {
      outer.innerHTML = '';

      const composition = gameScoreComposition(compositionName, {
        position: 'trailing',
        inverted: true
      });

      const engine = new ScoringEngine({ matchUpFormat: currentFormat });

      const matchUpContainer = document.createElement('div');

      const renderCurrentState = createRenderCurrentState(engine, fixture, matchUpContainer, composition);

      // Format row
      const formatRow = document.createElement('div');
      formatRow.style.cssText =
        'display:flex; align-items:center; gap:8px; margin-bottom:8px; font-family:sans-serif; font-size:13px;';
      const formatLabel = document.createElement('span');
      formatLabel.textContent = 'Format:';
      formatLabel.style.color = 'var(--chc-text-secondary)';
      const formatBtn = createFormatButton({
        currentFormat,
        onFormatChange: (newFormat) => {
          currentFormat = newFormat;
          buildUI();
        }
      });
      formatRow.append(formatLabel, formatBtn);

      const state: PlaybackState = {
        engine,
        fixture,
        cursor: 0,
        timer: null,
        playing: false,
        onUpdate: renderCurrentState
      };

      const controls = createPlaybackControls(state);

      const info = document.createElement('div');
      info.style.cssText = INFO_STYLE;
      info.textContent = `${fixture.players[0]} vs ${fixture.players[1]} — ${fixture.points.length} points`;

      outer.append(formatRow, info, controls, matchUpContainer);
      renderCurrentState();
    }

    buildUI();
    return outer;
  }
};

/**
 * Format Explorer — Build any format and score points manually.
 *
 * No fixture data. Pick any matchUpFormat via the editor modal, then
 * manually add points with Side 1 / Side 2 buttons, or toggle auto-play
 * for random winners. Demonstrates how ScoringEngine adapts to any format
 * code (tennis, pickleball, timed sets, etc.). Situation flags (break
 * point, set point, match point, tiebreak) are displayed below the score.
 */
export const FormatExplorer = {
  args: { composition: 'Australian' },
  argTypes: {
    composition: {
      options: Object.keys(compositions),
      control: { type: 'select' }
    }
  },
  render: (args: any) => {
    const compositionName = args.composition || 'Australian';
    let currentFormat = STANDARD_ADVANTAGE;
    const players = ['Player 1', 'Player 2'];

    const outer = document.createElement('div');
    outer.style.maxWidth = '550px';

    function buildUI() {
      outer.innerHTML = '';

      const composition = gameScoreComposition(compositionName, {
        position: 'trailing',
        inverted: true
      });

      const engine = new ScoringEngine({ matchUpFormat: currentFormat });
      let pointCount = 0;
      let autoTimer: ReturnType<typeof setInterval> | null = null;

      const matchUpContainer = document.createElement('div');
      const situationPanel = document.createElement('div');
      situationPanel.style.cssText =
        'font-family:monospace; font-size:12px; color:var(--chc-text-secondary); padding:8px; background:var(--chc-bg-secondary); border-radius:4px; margin-top:8px; min-height:1.5em;';

      const pointCountSpan = document.createElement('span');
      pointCountSpan.style.cssText = 'font-family:sans-serif; font-size:12px; color:var(--chc-text-secondary);';

      function renderCurrentState() {
        const fixtureInfo = { players };
        const matchUp = engineToMatchUp(engine, fixtureInfo);
        matchUpContainer.innerHTML = '';
        const rendered = renderMatchUp({ matchUp, composition, isLucky: true });
        const themed = renderContainer({ theme: composition.theme, content: rendered });
        matchUpContainer.appendChild(themed);

        // Situation flags
        const score = engine.getScore();
        const sit = score.situation;
        const flags = [
          sit?.isTiebreak && 'Tiebreak',
          sit?.isBreakPoint && 'Break Point',
          sit?.isGamePoint && 'Game Point',
          sit?.isSetPoint && 'Set Point',
          sit?.isMatchPoint && 'Match Point'
        ].filter(Boolean);

        const pointDisplay = score.pointDisplay ? score.pointDisplay.join('-') : '';
        const parts = [`Points: ${pointCount}`];
        if (pointDisplay) parts.push(pointDisplay);
        if (flags.length) parts.push(flags.join('  '));
        if (engine.isComplete()) parts.push('COMPLETE');
        situationPanel.textContent = parts.join('  |  ');

        pointCountSpan.textContent = `${pointCount} points played`;
      }

      // Format row
      const formatRow = document.createElement('div');
      formatRow.style.cssText =
        'display:flex; align-items:center; gap:8px; margin-bottom:8px; font-family:sans-serif; font-size:13px;';
      const formatLabel = document.createElement('span');
      formatLabel.textContent = 'Format:';
      formatLabel.style.color = 'var(--chc-text-secondary)';
      const formatBtn = createFormatButton({
        currentFormat,
        onFormatChange: (newFormat) => {
          if (autoTimer) clearInterval(autoTimer);
          currentFormat = newFormat;
          buildUI();
        }
      });
      formatRow.append(formatLabel, formatBtn);

      // Controls row
      const controlsRow = document.createElement('div');
      controlsRow.style.cssText =
        'display:flex; gap:6px; align-items:center; padding:8px 12px; background:var(--chc-bg-secondary); border-radius:6px; margin-bottom:12px; flex-wrap:wrap; font-family:sans-serif; font-size:13px; color:var(--chc-text-primary);';

      const mkBtn = (label: string, onclick: () => void) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText =
          'padding:4px 10px; border:1px solid var(--chc-border-primary); border-radius:4px; background:var(--chc-bg-primary); color:var(--chc-text-primary); cursor:pointer; font-size:12px; font-family:inherit;';
        b.onclick = onclick;
        return b;
      };

      const addPoint = (winner: 0 | 1) => {
        if (engine.isComplete()) return;
        const server = (pointCount % 2) as 0 | 1;
        engine.addPoint({ winner, server, result: 'Winner' as any });
        pointCount++;
        renderCurrentState();
      };

      const side1Btn = mkBtn('Side 1 +', () => addPoint(0));
      const side2Btn = mkBtn('Side 2 +', () => addPoint(1));

      const undoBtn = mkBtn('Undo', () => {
        if (pointCount > 0) {
          engine.undo();
          pointCount--;
          renderCurrentState();
        }
      });

      const resetBtn = mkBtn('Reset', () => {
        if (autoTimer) {
          clearInterval(autoTimer);
          autoTimer = null;
          autoBtn.textContent = 'Auto';
        }
        engine.reset();
        pointCount = 0;
        renderCurrentState();
      });

      const autoBtn = mkBtn('Auto', () => {
        if (autoTimer) {
          clearInterval(autoTimer);
          autoTimer = null;
          autoBtn.textContent = 'Auto';
        } else {
          autoBtn.textContent = 'Stop';
          autoTimer = setInterval(() => {
            if (engine.isComplete()) {
              clearInterval(autoTimer);
              autoTimer = null;
              autoBtn.textContent = 'Auto';
              return;
            }
            addPoint(Math.random() < 0.5 ? 0 : 1);
          }, 300);
        }
      });

      controlsRow.append(side1Btn, side2Btn, undoBtn, resetBtn, autoBtn, pointCountSpan);

      outer.append(formatRow, controlsRow, matchUpContainer, situationPanel);
      renderCurrentState();
    }

    buildUI();
    return outer;
  }
};
