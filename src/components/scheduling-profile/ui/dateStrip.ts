/**
 * Date Strip — Date navigation with issue badges.
 *
 * Stateless factory pattern: { element, update }.
 */

import type { ProfileStoreState, UIPanel } from '../types';
import {
  spPanelStyle,
  spPanelHeaderStyle,
  spPanelTitleStyle,
  spPanelMetaStyle,
  spDateStripStyle,
  spDateChipStyle,
  spBadgesStyle,
  spBadgeStyle,
} from './styles';

export interface DateStripCallbacks {
  onDateSelected: (date: string) => void;
}

export function buildDateStrip(callbacks: DateStripCallbacks): UIPanel<ProfileStoreState> {
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

  function update(state: ProfileStoreState): void {
    meta.textContent = `${state.schedulableDates.length} schedulable`;
    body.innerHTML = '';

    for (const d of state.schedulableDates) {
      const available = state.schedulableDates.includes(d);
      const counts = state.issueIndex.counts.byDate[d];

      const chip = document.createElement('div');
      chip.className = spDateChipStyle();
      if (d === state.selectedDate) chip.classList.add('selected');
      if (!available) chip.classList.add('unavailable');
      chip.setAttribute('data-date', d);

      const left = document.createElement('div');
      const dateLabel = document.createElement('div');
      dateLabel.style.cssText = 'font-weight:800;font-size:12px';
      dateLabel.textContent = d;
      const statusLabel = document.createElement('div');
      statusLabel.style.cssText = 'font-size:11px;color:var(--sp-muted)';
      statusLabel.textContent = available ? 'Schedulable' : 'Unavailable';
      left.appendChild(dateLabel);
      left.appendChild(statusLabel);

      const badges = document.createElement('div');
      badges.className = spBadgesStyle();

      if (counts?.ERROR) badges.appendChild(makeBadge(`${counts.ERROR} err`, 'err'));
      if (counts?.WARN) badges.appendChild(makeBadge(`${counts.WARN} warn`, 'warn'));
      if (!counts?.ERROR && !counts?.WARN) badges.appendChild(makeBadge('OK', 'ok'));

      chip.appendChild(left);
      chip.appendChild(badges);
      chip.addEventListener('click', () => callbacks.onDateSelected(d));
      body.appendChild(chip);
    }
  }

  return { element: root, update };
}

function makeBadge(text: string, kind: string): HTMLElement {
  const b = document.createElement('div');
  b.className = spBadgeStyle() + ' ' + kind;
  b.textContent = text;
  return b;
}
