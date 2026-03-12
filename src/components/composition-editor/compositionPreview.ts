/**
 * Live matchUp preview panel for composition editor.
 * Renders mock matchUps using the current composition settings.
 */
import { renderMatchUp } from '../renderStructure/renderMatchUp';
import { generateMatchUps } from '../../data/generateMatchUps';
import { cePreview, cePreviewHeader, cePreviewBody, cePreviewMatchup } from './styles';
import type { CompositionEditorState, EditorPanel } from './compositionEditorTypes';
import type { Composition } from '../../types';
import { KNOWN_SCALES } from './scaleConstants';

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
        accessor: s.accessor,
      })),
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
          participant: sampleParticipant,
        },
        {
          sideNumber: 2,
          drawPosition: 6,
          seedNumber: 6,
          seedValue: '6',
          participant: sampleParticipant2,
        },
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
            side2PointScore: '15',
          },
        ],
      },
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
          participant: sampleParticipant,
        },
        {
          sideNumber: 2,
          drawPosition: 8,
          bye: true,
        },
      ],
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
          participant: sampleParticipant,
        },
        {
          sideNumber: 2,
          drawPosition: 10,
        },
      ],
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
          qualifier: true,
        },
        {
          sideNumber: 2,
          drawPosition: 12,
          seedNumber: 4,
          seedValue: '4',
          participant: sampleParticipant,
        },
      ],
    };

    cachedMatchUps = [...completed, inProgressMatchUp, byeMatchUp, tbdMatchUp, qualifierMatchUp];
  }
  return cachedMatchUps;
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

  function update(state: CompositionEditorState): void {
    // Only re-render if something changed
    const configJson = JSON.stringify(state.configuration);
    if (state.theme === lastTheme && configJson === lastConfigJson) return;
    lastTheme = state.theme;
    lastConfigJson = configJson;

    body.innerHTML = '';

    const composition: Composition = {
      theme: state.theme,
      configuration: { ...state.configuration },
    };

    const matchUps = getMockMatchUps();
    for (const matchUp of matchUps) {
      const wrapper = document.createElement('div');
      wrapper.className = cePreviewMatchup();

      const rendered = renderMatchUp({
        matchUp,
        composition,
        isLucky: true,
      });
      wrapper.appendChild(rendered);
      body.appendChild(wrapper);
    }
  }

  return { element: root, update };
}
