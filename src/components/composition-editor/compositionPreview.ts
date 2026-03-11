/**
 * Live matchUp preview panel for composition editor.
 * Renders mock matchUps using the current composition settings.
 */
import { renderMatchUp } from '../renderStructure/renderMatchUp';
import { generateMatchUps } from '../../data/generateMatchUps';
import { cePreview, cePreviewHeader, cePreviewBody, cePreviewMatchup } from './styles';
import type { CompositionEditorState, EditorPanel } from './compositionEditorTypes';
import type { Composition } from '../../types';

// Generate mock matchUps once — reuse across renders
let cachedMatchUps: any[] | null = null;

function getMockMatchUps() {
  if (!cachedMatchUps) {
    const { matchUps: singles } = generateMatchUps({
      drawSize: 4,
      eventType: 'SINGLES',
      randomWinningSide: true,
      matchUpFormat: 'SET3-S:6/TB7',
    });
    cachedMatchUps = singles.slice(0, 3);
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
        isLucky: false,
      });
      wrapper.appendChild(rendered);
      body.appendChild(wrapper);
    }
  }

  return { element: root, update };
}
