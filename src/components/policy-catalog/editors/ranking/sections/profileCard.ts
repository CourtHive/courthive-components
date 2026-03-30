/**
 * Profile Card — Renders a single AwardProfile as an expandable card.
 *
 * Collapsed: profile name + scope badges on one line.
 * Expanded: editable position-points table, per-win, bonus, overrides.
 */
import type { RankingPointsEditorState } from '../types';
import type { RankingPointsEditorStore } from '../rankingPointsEditorStore';
import { buildPositionPointsTable } from './positionPointsTable';
import { buildPerWinPointsRow } from './perWinPointsRow';
import { buildBonusPointsRow } from './bonusPointsRow';
import { buildScopeBadges } from './scopeBadges';
import { buildScopeEditor } from './scopeEditor';
import { profileSummaryText } from '../domain/rankingProjections';
import {
  reProfileCardStyle,
  reProfileHeaderStyle,
  reProfileNameInputStyle,
  reProfileBodyStyle,
  reProfileActionsStyle,
  reIconBtnStyle,
  reIconBtnDangerStyle,
  reSectionChevronStyle,
} from '../styles';

export function buildProfileCard(
  store: RankingPointsEditorStore,
  profileIndex: number,
): {
  element: HTMLElement;
  update(state: RankingPointsEditorState): void;
} {
  const card = document.createElement('div');
  card.className = reProfileCardStyle();

  // --- Header ---
  const header = document.createElement('div');
  header.className = reProfileHeaderStyle();

  const chevron = document.createElement('span');
  chevron.className = reSectionChevronStyle();
  chevron.style.flexShrink = '0';
  header.appendChild(chevron);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = reProfileNameInputStyle();
  nameInput.addEventListener('click', (e) => e.stopPropagation());
  nameInput.addEventListener('change', () => store.setProfileName(profileIndex, nameInput.value));
  header.appendChild(nameInput);

  const badgesContainer = document.createElement('div');
  badgesContainer.style.cssText = 'flex-grow:1;display:inline-flex;gap:0.25rem;flex-wrap:wrap';
  header.appendChild(badgesContainer);

  const summaryEl = document.createElement('span');
  summaryEl.style.cssText = 'font-size:0.75rem;color:var(--sp-muted);white-space:nowrap;flex-shrink:0';
  header.appendChild(summaryEl);

  const actionsEl = document.createElement('div');
  actionsEl.className = reProfileActionsStyle();

  const dupBtn = document.createElement('button');
  dupBtn.className = reIconBtnStyle();
  dupBtn.textContent = '\u2398'; // ⎘ copy
  dupBtn.title = 'Duplicate profile';
  dupBtn.addEventListener('click', (e) => { e.stopPropagation(); store.duplicateProfile(profileIndex); });

  const delBtn = document.createElement('button');
  delBtn.className = reIconBtnDangerStyle();
  delBtn.textContent = '\u2715'; // ✕
  delBtn.title = 'Delete profile';
  delBtn.addEventListener('click', (e) => { e.stopPropagation(); store.removeProfile(profileIndex); });

  actionsEl.appendChild(dupBtn);
  actionsEl.appendChild(delBtn);
  header.appendChild(actionsEl);

  header.addEventListener('click', () => store.toggleProfile(profileIndex));
  card.appendChild(header);

  // --- Body (built once, shown/hidden) ---
  const body = document.createElement('div');
  body.className = reProfileBodyStyle();

  const fullNameEl = document.createElement('div');
  fullNameEl.style.cssText = 'font-weight:600;font-size:0.85rem;color:var(--sp-text);margin-bottom:6px';
  body.appendChild(fullNameEl);

  const posTable = buildPositionPointsTable(store, profileIndex);
  body.appendChild(posTable.element);

  const perWin = buildPerWinPointsRow(store, profileIndex);
  body.appendChild(perWin.element);

  const bonus = buildBonusPointsRow(store, profileIndex);
  body.appendChild(bonus.element);

  const scope = buildScopeEditor(store, profileIndex);
  body.appendChild(scope.element);

  const overridesEl = document.createElement('div');
  overridesEl.style.cssText = 'padding:0.25rem 0;font-size:0.75rem;color:var(--sp-muted)';
  body.appendChild(overridesEl);

  card.appendChild(body);

  function update(state: RankingPointsEditorState): void {
    const profile = state.draft.awardProfiles?.[profileIndex];
    if (!profile) {
      card.style.display = 'none';
      return;
    }
    card.style.display = '';

    const expanded = state.expandedProfiles.has(profileIndex);
    const ro = state.readonly;

    // Header
    chevron.textContent = expanded ? '\u25BC' : '\u25B6';
    const displayName = profile.profileName || `Profile ${profileIndex + 1}`;
    if (document.activeElement !== nameInput) {
      nameInput.value = displayName;
    }
    nameInput.title = displayName;
    nameInput.disabled = ro;

    // Scope badges
    badgesContainer.innerHTML = '';
    const badges = buildScopeBadges(profile);
    badges.style.flexGrow = '1';
    badgesContainer.appendChild(badges);

    // Summary (collapsed only)
    summaryEl.textContent = expanded ? '' : profileSummaryText(profile);

    // Action buttons
    actionsEl.style.display = ro ? 'none' : 'flex';

    // Body visibility
    body.style.display = expanded ? '' : 'none';

    if (expanded) {
      fullNameEl.textContent = displayName;
      posTable.update(state);
      perWin.update(state);
      bonus.update(state);
      scope.update(state);

      // Profile-level overrides display
      const overrides: string[] = [];
      if (profile.requireWinForPoints !== undefined) overrides.push(`requireWin: ${profile.requireWinForPoints}`);
      if (profile.requireWinFirstRound !== undefined) overrides.push(`requireWinR1: ${profile.requireWinFirstRound}`);
      overridesEl.textContent = overrides.join(' | ');
      overridesEl.style.display = overrides.length ? '' : 'none';
    }
  }

  return { element: card, update };
}
