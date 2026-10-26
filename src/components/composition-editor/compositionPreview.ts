/**
 * Live matchUp preview panel for composition editor.
 * Renders mock matchUps using the current composition settings.
 */
import { applyCompositionColors, clearCompositionColors } from '../../styles/applyCompositionColors';
import { renderRoundHeader } from '../renderStructure/renderRoundHeader';
import { renderStructure } from '../renderStructure/renderStructure';
import { renderMatchUp } from '../renderStructure/renderMatchUp';
import { generateMatchUps } from '../../data/generateMatchUps';
import { cePreview, cePreviewHeader, cePreviewBody, cePreviewMatchup } from './styles';
import type { CompositionEditorState, EditorPanel } from './compositionEditorTypes';
import type { Composition } from '../../types';
import { KNOWN_SCALES } from './scaleConstants';

const PREVIEW_HANDLERS = { matchUpShare: () => undefined };

// Generate mock matchUps once — reuse across renders
let cachedMatchUps: any[] | null = null;

function getMockMatchUps() {
  if (!cachedMatchUps) {
    const { matchUps: singles } = generateMatchUps({
      drawSize: 8,
      eventType: 'SINGLES',
      randomWinningSide: true,
      matchUpFormat: 'SET3-S:6/TB7',
      withAllRatings: KNOWN_SCALES.map((s) => ({
        scaleName: s.scaleName,
        accessor: s.accessor
      }))
    });

    // 2 completed first-round matchUps — show seeds, scores, flags, draw positions
    const firstRound = singles.filter((m: any) => m.roundNumber === 1);
    const completed = firstRound.slice(0, 2);

    // Extract real participants from the completed matchUps for reuse in placeholders
    const sampleParticipant = completed[0]?.sides?.[0]?.participant;
    const sampleParticipant2 = completed[0]?.sides?.[1]?.participant;

    // In-progress matchUp with game score and point scores
    const inProgressMatchUp = {
      matchUpId: 'preview-in-progress',
      matchUpType: 'SINGLES',
      matchUpStatus: 'IN_PROGRESS',
      roundNumber: 1,
      sides: [
        {
          sideNumber: 1,
          drawPosition: 5,
          seedNumber: 3,
          seedValue: '3',
          participant: sampleParticipant
        },
        {
          sideNumber: 2,
          drawPosition: 6,
          seedNumber: 6,
          seedValue: '6',
          participant: sampleParticipant2
        }
      ],
      score: {
        scoreStringSide1: '6-4 3-2',
        scoreStringSide2: '4-6 2-3',
        sets: [
          { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
          {
            setNumber: 2,
            side1Score: 3,
            side2Score: 2,
            side1PointScore: '30',
            side2PointScore: '15'
          }
        ]
      }
    };

    // BYE matchUp — one real participant vs BYE
    const byeMatchUp = {
      matchUpId: 'preview-bye',
      matchUpType: 'SINGLES',
      matchUpStatus: 'BYE',
      roundNumber: 1,
      sides: [
        {
          sideNumber: 1,
          drawPosition: 7,
          seedNumber: 2,
          seedValue: '2',
          participant: sampleParticipant
        },
        {
          sideNumber: 2,
          drawPosition: 8,
          bye: true
        }
      ]
    };

    // TBD matchUp — one real participant vs unassigned position
    const tbdMatchUp = {
      matchUpId: 'preview-tbd',
      matchUpType: 'SINGLES',
      matchUpStatus: 'TO_BE_PLAYED',
      roundNumber: 1,
      sides: [
        {
          sideNumber: 1,
          drawPosition: 9,
          seedNumber: 3,
          seedValue: '3',
          participant: sampleParticipant
        },
        {
          sideNumber: 2,
          drawPosition: 10
        }
      ]
    };

    // Qualifier matchUp — one real participant vs qualifier placeholder
    const qualifierMatchUp = {
      matchUpId: 'preview-qualifier',
      matchUpType: 'SINGLES',
      matchUpStatus: 'TO_BE_PLAYED',
      roundNumber: 1,
      sides: [
        {
          sideNumber: 1,
          drawPosition: 11,
          qualifier: true
        },
        {
          sideNumber: 2,
          drawPosition: 12,
          seedNumber: 4,
          seedValue: '4',
          participant: sampleParticipant
        }
      ]
    };

    // what the scoreboard options read: place and playing time, event and round, server, stream and video
    const resource = (resourceSubType: string, name: string) => ({
      resourceType: 'URL',
      resourceSubType,
      name,
      identifier: `https://courthive.com/#${name}`
    });
    const live = inProgressMatchUp as any;
    Object.assign(live, {
      eventName: "Men's Singles",
      roundName: 'R32',
      serverSideNumber: 2,
      onlineResources: [resource('STREAM', 'liveStream'), resource('VIDEO', 'matchVideo')],
      schedule: { courtName: 'Court 2', venueAbbreviation: 'RMTA', milliseconds: 16 * 60_000 }
    });
    if (completed[0]) {
      Object.assign(completed[0], {
        eventName: "Men's Singles",
        roundName: 'R32',
        onlineResources: [resource('VIDEO', 'matchVideo')],
        schedule: {
          ...completed[0].schedule,
          courtName: 'Court 11',
          venueAbbreviation: 'RMTA',
          milliseconds: 67 * 60_000
        }
      });
    }

    cachedMatchUps = [...completed, inProgressMatchUp, byeMatchUp, tbdMatchUp, qualifierMatchUp];
  }
  return cachedMatchUps;
}

// A small, connected bracket so connector + border colors are visible.
// Uses real matchUps (with structureId / roundNumber / roundPosition) so
// renderStructure draws the chc-link pseudo-elements between rounds.
let cachedBracketMatchUps: any[] | null = null;

function getBracketMockMatchUps() {
  if (!cachedBracketMatchUps) {
    const { matchUps } = generateMatchUps({
      drawSize: 4,
      eventType: 'SINGLES',
      matchUpFormat: 'SET3-S:6/TB7',
      completionGoal: 50,
      randomWinningSide: true
    });
    cachedBracketMatchUps = matchUps;
  }
  return cachedBracketMatchUps;
}

export function buildCompositionPreview(): EditorPanel {
  const root = document.createElement('div');
  root.className = cePreview();

  const header = document.createElement('div');
  header.className = cePreviewHeader();
  header.textContent = 'Preview';
  root.appendChild(header);

  const body = document.createElement('div');
  body.className = cePreviewBody();
  root.appendChild(body);

  let lastTheme = '';
  let lastConfigJson = '';
  let lastColorsJson = '';

  function update(state: CompositionEditorState): void {
    // Only re-render if something changed
    const configJson = JSON.stringify(state.configuration);
    const colorsJson = JSON.stringify(state.colors || {});
    if (state.theme === lastTheme && configJson === lastConfigJson && colorsJson === lastColorsJson) return;
    lastTheme = state.theme;
    lastConfigJson = configJson;
    lastColorsJson = colorsJson;

    body.innerHTML = '';
    // Clear any previously-applied color custom properties before re-applying
    clearCompositionColors(body);
    applyCompositionColors(body, state.colors);

    // The preview renders the configuration as it is: forcing the footer on (so its colour controls had something to
    // paint) showed a footer whose toggle read off (CA, 2026-10-26). The footer colour rows say where to turn it on.
    const composition: Composition = {
      theme: state.theme,
      configuration: { ...state.configuration },
      colors: state.colors ? { ...state.colors } : undefined
    };

    // Sample round header above the matchUp cards so the round-header
    // color controls (text / background / underline) have something to
    // paint in the preview, regardless of whether `roundHeader` is on in
    // this composition's configuration.
    const sampleHeader = renderRoundHeader({
      roundNumber: 1,
      roundProfile: { 1: { roundName: 'Round 1' } }
    });
    body.appendChild(sampleHeader);

    const matchUps = getMockMatchUps();
    for (const matchUp of matchUps) {
      const wrapper = document.createElement('div');
      wrapper.className = cePreviewMatchup();

      const rendered = renderMatchUp({
        matchUp,
        composition,
        // a share handler, so matchUpActions.share has a button to show
        eventHandlers: PREVIEW_HANDLERS,
        isLucky: true
      });
      wrapper.appendChild(rendered);
      body.appendChild(wrapper);
    }

    // Connector-preview panel: small connected bracket so the connector
    // and border colors set on the composition can actually be seen.
    const bracketLabel = document.createElement('div');
    bracketLabel.style.cssText =
      'margin-top:1.5rem; padding:0 0.25rem; font-size:0.7rem; ' +
      'color:var(--chc-text-secondary); text-transform:uppercase; letter-spacing:0.05em;';
    bracketLabel.textContent = 'Connector preview';
    body.appendChild(bracketLabel);

    const bracket = renderStructure({
      matchUps: getBracketMockMatchUps(),
      composition
    });
    body.appendChild(bracket);
  }

  return { element: root, update };
}
