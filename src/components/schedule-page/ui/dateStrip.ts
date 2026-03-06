/**
 * Date Strip — Left panel: date navigation with matchUp count + issue badges.
 *
 * Stateless factory pattern: { element, update }.
 */

import type { SchedulePageState, UIPanel } from '../types';
import {
  spPanelStyle,
  spPanelHeaderStyle,
  spPanelTitleStyle,
  spPanelMetaStyle,
  spDateStripStyle,
  spDateChipStyle,
  spBadgesStyle,
} from './styles';

export interface DateStripCallbacks {
  onDateSelected: (date: string) => void;
}

export function buildScheduleDateStrip(callbacks: DateStripCallbacks): UIPanel<SchedulePageState> {
  const root = document.createElement('div');
  root.className = spPanelStyle();

  // Header
  const header = document.createElement('div');
  header.className = spPanelHeaderStyle();
  const title = document.createElement('div');
  title.className = spPanelTitleStyle();
  title.textContent = 'Dates';
  const meta = document.createElement('div');
  meta.className = spPanelMetaStyle();
  header.appendChild(title);
  header.appendChild(meta);
  root.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = spDateStripStyle();
  root.appendChild(body);

  function update(state: SchedulePageState): void {
    const dates = state.scheduleDates;
    meta.textContent = `${dates.length} dates`;
    body.innerHTML = '';

    for (const d of dates) {
      const chip = document.createElement('div');
      chip.className = spDateChipStyle();
      if (d.date === state.selectedDate) chip.classList.add('selected');
      if (!d.isActive) chip.classList.add('inactive');
      chip.setAttribute('data-date', d.date);

      const left = document.createElement('div');
      const dateLabel = document.createElement('div');
      dateLabel.style.cssText = 'font-weight:800;font-size:12px';
      dateLabel.textContent = d.date;
      const statusLabel = document.createElement('div');
      statusLabel.style.cssText = 'font-size:11px;color:var(--sp-muted)';
      statusLabel.textContent = d.isActive ? 'Active' : 'Inactive';
      left.appendChild(dateLabel);
      left.appendChild(statusLabel);

      const badges = document.createElement('div');
      badges.className = spBadgesStyle();

      if (d.matchUpCount != null) {
        const b = document.createElement('div');
        b.className = 'spl-date-badge matchups';
        b.textContent = `${d.matchUpCount} matchUps`;
        badges.appendChild(b);
      }
      if (d.issueCount && d.issueCount > 0) {
        const b = document.createElement('div');
        b.className = 'spl-date-badge issues';
        b.textContent = `${d.issueCount} issues`;
        badges.appendChild(b);
      }

      chip.appendChild(left);
      chip.appendChild(badges);
      chip.addEventListener('click', () => callbacks.onDateSelected(d.date));
      body.appendChild(chip);
    }
  }

  return { element: root, update };
}
