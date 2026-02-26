/**
 * Issues Panel — Left panel: validation issue list.
 *
 * Stateless factory pattern: { element, update }.
 */

import type { ProfileStoreState, UIPanel, FixAction } from '../types';
import {
  spPanelStyle,
  spPanelHeaderStyle,
  spPanelTitleStyle,
  spPanelMetaStyle,
  spIssuesStyle,
  spIssueStyle,
  spIssueCodeStyle,
  spIssueMsgStyle,
  spIssueActionsStyle,
  spIssueActionBtnStyle,
  spSmallStyle,
} from './styles';

export interface IssuesPanelCallbacks {
  onFixAction: (action: FixAction) => void;
}

export function buildIssuesPanel(callbacks: IssuesPanelCallbacks): UIPanel<ProfileStoreState> {
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

  function update(state: ProfileStoreState): void {
    const all = state.issueIndex.all;
    meta.textContent = `${all.length} total (${state.issueIndex.bySeverity.ERROR.length} errors)`;
    body.innerHTML = '';

    if (!all.length) {
      const hint = document.createElement('div');
      hint.className = spSmallStyle();
      hint.textContent = 'No issues. Drag rounds into the board to build a profile.';
      body.appendChild(hint);
      return;
    }

    for (const issue of all.slice(0, 30)) {
      const div = document.createElement('div');
      div.className = spIssueStyle();
      if (issue.severity === 'ERROR') div.classList.add('error');
      else if (issue.severity === 'WARN') div.classList.add('warn');
      else div.classList.add('info');

      const code = document.createElement('div');
      code.className = spIssueCodeStyle();
      code.textContent = `${issue.severity} \u00b7 ${issue.code}`;

      const msg = document.createElement('div');
      msg.className = spIssueMsgStyle();
      msg.textContent = issue.message;

      div.appendChild(code);
      div.appendChild(msg);

      if (issue.fixActions?.length) {
        const actions = document.createElement('div');
        actions.className = spIssueActionsStyle();

        for (const a of issue.fixActions) {
          const btn = document.createElement('button');
          btn.className = spIssueActionBtnStyle();
          btn.textContent = a.label ?? a.kind;
          btn.addEventListener('click', () => callbacks.onFixAction(a));
          actions.appendChild(btn);
        }

        div.appendChild(actions);
      }

      body.appendChild(div);
    }
  }

  return { element: root, update };
}
