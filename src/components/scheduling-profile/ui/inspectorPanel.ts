/**
 * Inspector Panel — Right panel: selected card details.
 *
 * Stateless factory pattern: { element, update }.
 */

import type { ProfileStoreState, UIPanel } from '../types';
import { getRoundAt, findIssuesForLocator, maxSeverity } from '../domain/profileProjections';
import {
  spPanelStyle,
  spPanelHeaderStyle,
  spPanelTitleStyle,
  spInspectorStyle,
  spKvStyle,
  spKvKeyStyle,
  spKvValueStyle,
  spSmallStyle,
} from './styles';

export function buildInspectorPanel(): UIPanel<ProfileStoreState> {
  const root = document.createElement('div');
  root.className = spPanelStyle();

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

  function update(state: ProfileStoreState): void {
    body.innerHTML = '';
    const loc = state.selectedLocator;

    if (!loc) {
      const hint = document.createElement('div');
      hint.className = spSmallStyle();
      hint.textContent = 'Select a round card on the board to see details and context.';
      body.appendChild(hint);
      return;
    }

    const r = getRoundAt(state.profileDraft, loc);
    if (!r) {
      const hint = document.createElement('div');
      hint.className = spSmallStyle();
      hint.textContent = 'Selection no longer exists.';
      body.appendChild(hint);
      return;
    }

    const issues = findIssuesForLocator(state.ruleResults, loc);
    const sev = maxSeverity(issues);

    appendKv(body, 'Event', r.eventName ?? '');
    appendKv(body, 'Draw', r.drawName || '');
    const roundLabel = r.roundName && !/^rn=/.test(r.roundName) ? r.roundName : 'Round ' + r.roundNumber;
    appendKv(body, 'Round', roundLabel);
    appendKv(
      body,
      'Segment',
      r.roundSegment ? `${r.roundSegment.segmentNumber}/${r.roundSegment.segmentsCount}` : '\u2014',
    );
    appendKv(body, 'Not before', r.notBeforeTime ?? '\u2014');
    appendKv(body, 'Status', sev ?? 'OK');

    if (issues.length) {
      const hint = document.createElement('div');
      hint.className = spSmallStyle();
      hint.style.marginTop = '8px';
      hint.textContent = 'Issues for this item:';
      body.appendChild(hint);

      for (const i of issues) {
        const line = document.createElement('div');
        line.className = spSmallStyle();
        line.innerHTML = `\u2022 <b>${escapeHtml(i.code)}</b>: ${escapeHtml(i.message)}`;
        body.appendChild(line);
      }
    } else {
      const hint = document.createElement('div');
      hint.className = spSmallStyle();
      hint.style.marginTop = '8px';
      hint.textContent = 'No issues associated with this card.';
      body.appendChild(hint);
    }
  }

  return { element: root, update };
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

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
