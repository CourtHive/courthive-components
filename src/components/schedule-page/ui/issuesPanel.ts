/**
 * Issues Panel — Left panel: scheduling conflict list.
 *
 * Stateless factory pattern: { element, update }.
 */

import type { SchedulePageState, UIPanel } from '../types';
import { buildScheduleIssueIndex } from '../domain/scheduleIssues';
import {
  spPanelStyle,
  spPanelHeaderStyle,
  spPanelTitleStyle,
  spPanelMetaStyle,
  spIssuesStyle,
  spIssueStyle,
  spIssueCodeStyle,
  spIssueMsgStyle,
  spSmallStyle,
} from './styles';

export function buildScheduleIssuesPanel(): UIPanel<SchedulePageState> {
  const root = document.createElement('div');
  root.className = spPanelStyle();

  // Header
  const header = document.createElement('div');
  header.className = spPanelHeaderStyle();
  const title = document.createElement('div');
  title.className = spPanelTitleStyle();
  title.textContent = 'Issues';
  const meta = document.createElement('div');
  meta.className = spPanelMetaStyle();
  header.appendChild(title);
  header.appendChild(meta);
  root.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = spIssuesStyle();
  root.appendChild(body);

  function update(state: SchedulePageState): void {
    const index = buildScheduleIssueIndex(state.issues);
    meta.textContent = `${index.counts.total} total (${index.counts.ERROR} errors)`;
    body.innerHTML = '';

    if (!index.all.length) {
      const hint = document.createElement('div');
      hint.className = spSmallStyle();
      hint.textContent = 'No scheduling conflicts.';
      body.appendChild(hint);
      return;
    }

    for (const issue of index.all.slice(0, 30)) {
      const div = document.createElement('div');
      div.className = spIssueStyle();
      if (issue.severity === 'ERROR') div.classList.add('error');
      else if (issue.severity === 'WARN') div.classList.add('warn');
      else div.classList.add('info');

      const code = document.createElement('div');
      code.className = spIssueCodeStyle();
      code.textContent = issue.severity;

      const msg = document.createElement('div');
      msg.className = spIssueMsgStyle();
      msg.textContent = issue.message;

      div.appendChild(code);
      div.appendChild(msg);
      body.appendChild(div);
    }
  }

  return { element: root, update };
}
