/**
 * Team Card — DOM Factory.
 *
 * Stateless function: TeamCardData -> HTMLElement. Mirrors the contract
 * of the other card primitives in this directory; v1 has no field-array
 * config because the only rendered zones are name / nickname / counts.
 * Add config when a second consumer needs to hide one of those zones.
 */

import { TeamCardCallbacks, TeamCardData } from './types';
import {
  tcCardClass,
  tcCardClickableClass,
  tcCountsClass,
  tcNameClass,
  tcNicknameClass,
  tcTitleRowClass
} from './styles';

const COUNTS_SEPARATOR = ' · ';

export function buildTeamCard(data: TeamCardData, callbacks?: TeamCardCallbacks): HTMLElement {
  const card = document.createElement('div');
  card.className = tcCardClass();
  if (data.teamId) card.dataset.teamId = data.teamId;

  if (callbacks?.onClick) {
    card.classList.add(tcCardClickableClass());
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onClick!(data);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        callbacks.onClick!(data);
      }
    });
  }

  card.appendChild(buildTitleRow(data));

  const segments = (data.countSegments ?? []).map((s) => (s ?? '').trim()).filter(Boolean);
  if (segments.length) card.appendChild(buildCountsRow(segments));

  return card;
}

function buildTitleRow(data: TeamCardData): HTMLElement {
  const row = document.createElement('div');
  row.className = tcTitleRowClass();

  const name = document.createElement('span');
  name.className = tcNameClass();
  name.textContent = data.teamName;
  row.appendChild(name);

  if (data.nickname) {
    const nick = document.createElement('span');
    nick.className = tcNicknameClass();
    nick.textContent = `"${data.nickname}"`;
    row.appendChild(nick);
  }

  return row;
}

function buildCountsRow(segments: string[]): HTMLElement {
  const counts = document.createElement('div');
  counts.className = tcCountsClass();
  counts.textContent = segments.join(COUNTS_SEPARATOR);
  return counts;
}
