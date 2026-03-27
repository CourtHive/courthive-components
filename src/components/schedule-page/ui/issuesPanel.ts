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
  spSmallStyle
} from './styles';

const pulseClass = 'spl-cell--issue-pulse';

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

      if (issue.participants) {
        // Structured rendering with colored participant names
        if (issue.prefix) {
          const prefixSpan = document.createElement('span');
          prefixSpan.textContent = issue.prefix;
          prefixSpan.style.opacity = '0.7';
          msg.appendChild(prefixSpan);
        }
        const typeSpan = document.createElement('span');
        typeSpan.textContent = (issue.issueType || '') + ': ';
        typeSpan.style.opacity = '0.7';
        msg.appendChild(typeSpan);

        const p1 = document.createElement('span');
        p1.textContent = issue.participants;
        p1.style.color = 'var(--spl-issue-participant1, #4fc3f7)';
        p1.style.fontWeight = '600';
        msg.appendChild(p1);

        if (issue.conflictParticipants?.length) {
          const sep = document.createElement('span');
          sep.textContent = ' conflicts with ';
          sep.style.opacity = '0.7';
          msg.appendChild(sep);

          issue.conflictParticipants.forEach((cp, i) => {
            if (i > 0) {
              const comma = document.createElement('span');
              comma.textContent = ', ';
              comma.style.opacity = '0.7';
              msg.appendChild(comma);
            }
            const p2 = document.createElement('span');
            p2.textContent = cp;
            p2.style.color = 'var(--spl-issue-participant2, #ffb74d)';
            p2.style.fontWeight = '600';
            msg.appendChild(p2);
          });
        }
      } else {
        msg.textContent = issue.message;
      }

      if (issue.matchUpId) {
        div.style.cursor = 'pointer';
        const mid = issue.matchUpId;
        div.addEventListener('click', () => {
          console.log('[issuesPanel] clicked issue row, matchUpId:', mid);
          scrollToMatchUp(mid);
        });
      } else {
        console.log('[issuesPanel] issue has no matchUpId:', issue.message);
      }

      div.appendChild(code);
      div.appendChild(msg);
      body.appendChild(div);
    }
  }

  function scrollToMatchUp(matchUpId: string): void {
    const selector = `.spl-grid-cell[data-matchup-id="${matchUpId}"]`;
    const cell = document.querySelector(selector) as HTMLElement | null; //NOSONAR
    console.log('[issuesPanel] scrollToMatchUp selector:', selector, 'found:', !!cell);
    if (!cell) return;

    cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    // Remove any existing pulse, then re-apply to retrigger animation
    cell.classList.remove(pulseClass);
    // Force reflow so removing and re-adding the class restarts the animation
    void cell.offsetWidth; // NOSONAR
    cell.classList.add(pulseClass);
    cell.addEventListener('animationend', () => cell.classList.remove(pulseClass), { once: true });
  }

  return { element: root, update };
}
