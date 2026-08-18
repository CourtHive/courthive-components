/**
 * Inspector Panel — Right panel: selected matchUp details.
 *
 * Stateless factory pattern: { element, update }.
 *
 * The panel rebuilds its body on every `update`, so consumer-supplied detail
 * cannot be appended from the outside — it would be wiped by the next state
 * change. `options.renderExtra` is the supported seam: it is invoked as part
 * of each render, after the built-in fields.
 */

import { CatalogMatchUpItem, SchedulePageState, UIPanel } from '../types';
import { participantLabel } from '../domain/utils';
import {
  spPanelStyle,
  spPanelHeaderStyle,
  spPanelTitleStyle,
  spInspectorStyle,
  spKvStyle,
  spKvKeyStyle,
  spKvValueStyle,
  spSmallStyle
} from './styles';

export interface ScheduleInspectorPanelOptions {
  /** Consumer-supplied detail rendered below the built-in fields, for the selected
   *  matchUp only. Must return a freshly created element (or null) — the body is
   *  rebuilt on every render, so a cached node would be re-parented, not reused. */
  renderExtra?: (matchUp: CatalogMatchUpItem, state: SchedulePageState) => HTMLElement | null;
}

export function buildScheduleInspectorPanel(options: ScheduleInspectorPanelOptions = {}): UIPanel<SchedulePageState> {
  const root = document.createElement('div');
  root.className = spPanelStyle();
  // Stable identity for consumers that reach into a mounted layout (e.g. to show
  // or hide this panel independently of the catalog). Sibling panels share
  // `spPanelStyle()`, so class alone cannot tell them apart.
  root.dataset.panel = 'inspector';

  // Header
  const header = document.createElement('div');
  header.className = spPanelHeaderStyle();
  const title = document.createElement('div');
  title.className = spPanelTitleStyle();
  title.textContent = 'Inspector';
  header.appendChild(title);
  root.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = spInspectorStyle();
  root.appendChild(body);

  function update(state: SchedulePageState): void {
    body.innerHTML = '';
    const m = state.selectedMatchUp;

    if (!m) {
      const hint = document.createElement('div');
      hint.className = spSmallStyle();
      hint.textContent = 'Select a matchUp in the catalog to see details.';
      body.appendChild(hint);
      return;
    }

    appendKv(body, 'Event', m.eventName);
    appendKv(body, 'Draw', m.drawName ?? m.drawId);
    appendKv(body, 'Round', m.roundName ?? `Round ${m.roundNumber}`);
    appendKv(body, 'Type', m.matchUpType ?? '\u2014');
    appendKv(body, 'Format', m.matchUpFormat ?? '\u2014');
    appendKv(body, 'Scheduled', m.isScheduled ? 'Yes' : 'No');
    if (m.scheduledTime) appendKv(body, 'Time', m.scheduledTime);
    if (m.scheduledCourtName) appendKv(body, 'Court', m.scheduledCourtName);

    // Sides
    if (m.sides?.length) {
      const sidesHeader = document.createElement('div');
      sidesHeader.className = spSmallStyle();
      sidesHeader.style.marginTop = '8px';
      sidesHeader.textContent = 'Participants:';
      body.appendChild(sidesHeader);

      const sidesDiv = document.createElement('div');
      sidesDiv.className = 'spl-inspector-sides';
      for (const side of m.sides) {
        const sideEl = document.createElement('div');
        sideEl.className = 'spl-inspector-side';
        const nameEl = document.createElement('span');
        nameEl.textContent = participantLabel(side) || 'TBD';
        sideEl.appendChild(nameEl);
        if (side.ranking) {
          const rankEl = document.createElement('span');
          rankEl.className = 'spl-inspector-seed';
          rankEl.textContent = `#${side.ranking}`;
          sideEl.appendChild(rankEl);
        }
        sidesDiv.appendChild(sideEl);
      }
      body.appendChild(sidesDiv);
    }

    appendExtra(body, options, m, state);
  }

  return { element: root, update };
}

/** Render the consumer's extra detail block, if one was supplied. */
function appendExtra(
  body: HTMLElement,
  options: ScheduleInspectorPanelOptions,
  matchUp: CatalogMatchUpItem,
  state: SchedulePageState
): void {
  if (!options.renderExtra) return;
  try {
    const extra = options.renderExtra(matchUp, state);
    if (extra) body.appendChild(extra);
  } catch (err) {
    // Fail soft, but never silently: a consumer's detail block must not take
    // down the whole inspector, and an operator seeing a missing section needs
    // the console to say why.
    console.error('[schedule-page] inspector renderExtra threw', err);
  }
}

function appendKv(parent: HTMLElement, key: string, value: string): void {
  const row = document.createElement('div');
  row.className = spKvStyle();

  const k = document.createElement('div');
  k.className = spKvKeyStyle();
  k.textContent = key;

  const v = document.createElement('div');
  v.className = spKvValueStyle();
  v.textContent = value;

  row.appendChild(k);
  row.appendChild(v);
  parent.appendChild(row);
}
