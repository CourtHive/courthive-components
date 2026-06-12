/**
 * "Status code refinements" section.
 *
 * Six collapsible status groups (ABANDONED, CANCELLED, DEFAULTED,
 * INCOMPLETE, RETIRED, WALKOVER), each owning a tag-list of caller-
 * defined codes that downstream governors interpret. Most operators
 * touch only one or two; collapsing the rest keeps the section short.
 *
 * Plus an Advanced expander that exposes the processCodes.
 * incompleteAssignmentsOnDefault list — niche, but the canonical
 * factory default ships one entry so we don't want to lose round-trip
 * fidelity on save.
 */

import { MATCH_UP_STATUS_KEYS, type ScoringEditorState, type MatchUpStatusKey } from '../types';
import type { ScoringEditorStore } from '../scoringEditorStore';
import { buildTagListEditor, type TagListEditorHandle } from './tagListEditor';

interface StatusGroupHandle {
  key: MatchUpStatusKey;
  countEl: HTMLElement;
  chevron: HTMLElement;
  body: HTMLElement;
  tagList: TagListEditorHandle;
}

export function buildStatusCodesSection(store: ScoringEditorStore): {
  element: HTMLElement;
  update(state: ScoringEditorState): void;
} {
  const root = document.createElement('div');
  root.className = 'sc-section-body-inner';

  const groups: StatusGroupHandle[] = MATCH_UP_STATUS_KEYS.map((key) => buildStatusGroup(store, key));
  for (const group of groups) root.appendChild(groupShell(group, () => store.toggleStatus(group.key)));

  // ── Advanced (process codes) ───────────────────────
  const advancedShell = document.createElement('div');
  advancedShell.className = 'sc-advanced';
  const advancedHeader = document.createElement('div');
  advancedHeader.className = 'sc-advanced-header';
  const advancedChevron = document.createElement('span');
  advancedChevron.className = 'sc-advanced-chevron';
  const advancedTitle = document.createElement('span');
  advancedTitle.textContent = 'Advanced — process codes';
  advancedHeader.appendChild(advancedChevron);
  advancedHeader.appendChild(advancedTitle);
  advancedHeader.addEventListener('click', () => store.setAdvancedOpen(!store.getState().advancedOpen));
  const advancedBody = document.createElement('div');
  advancedBody.className = 'sc-advanced-body';
  advancedBody.style.display = 'none';
  const advancedHelp = document.createElement('div');
  advancedHelp.className = 'sc-field-help';
  advancedHelp.textContent = 'Tokens passed to downstream governors when assignments are incomplete on default. The factory default ships ["RANKING.IGNORE"].';
  advancedBody.appendChild(advancedHelp);
  const advancedTagList = buildTagListEditor({
    values: store.getData().processCodes?.incompleteAssignmentsOnDefault ?? [],
    placeholder: 'e.g. RANKING.IGNORE',
    readonly: store.isReadonly(),
    onAdd: (value) => store.addProcessCode(value),
    onRemove: (index) => store.removeProcessCode(index),
  });
  advancedBody.appendChild(advancedTagList.element);
  advancedShell.appendChild(advancedHeader);
  advancedShell.appendChild(advancedBody);
  root.appendChild(advancedShell);

  function update(state: ScoringEditorState): void {
    for (const group of groups) {
      const list = state.draft.matchUpStatusCodes?.[group.key] ?? [];
      group.countEl.textContent = String(list.length);
      const expanded = state.expandedStatuses.has(group.key);
      group.chevron.textContent = expanded ? '▾' : '▸';
      group.body.style.display = expanded ? 'block' : 'none';
      group.tagList.setValues(list);
    }
    advancedChevron.textContent = state.advancedOpen ? '▾' : '▸';
    advancedBody.style.display = state.advancedOpen ? 'block' : 'none';
    advancedTagList.setValues(state.draft.processCodes?.incompleteAssignmentsOnDefault ?? []);
  }

  return { element: root, update };
}

function buildStatusGroup(store: ScoringEditorStore, key: MatchUpStatusKey): StatusGroupHandle {
  const chevron = document.createElement('span');
  chevron.className = 'sc-status-chevron';
  const countEl = document.createElement('span');
  countEl.className = 'sc-status-count';
  const body = document.createElement('div');
  body.className = 'sc-status-body';
  const tagList = buildTagListEditor({
    values: store.getData().matchUpStatusCodes?.[key] ?? [],
    placeholder: 'e.g. INJURY',
    readonly: store.isReadonly(),
    onAdd: (value) => store.addStatusCode(key, value),
    onRemove: (index) => store.removeStatusCode(key, index),
  });
  body.appendChild(tagList.element);
  return { key, chevron, countEl, body, tagList };
}

function groupShell(group: StatusGroupHandle, onToggle: () => void): HTMLElement {
  const root = document.createElement('div');
  root.className = 'sc-status-group';
  const header = document.createElement('div');
  header.className = 'sc-status-header';
  const label = document.createElement('span');
  label.className = 'sc-status-label';
  label.textContent = capitalize(group.key);
  header.appendChild(group.chevron);
  header.appendChild(label);
  const countWrap = document.createElement('span');
  countWrap.className = 'sc-status-count-wrap';
  countWrap.appendChild(document.createTextNode('('));
  countWrap.appendChild(group.countEl);
  countWrap.appendChild(document.createTextNode(')'));
  header.appendChild(countWrap);
  header.addEventListener('click', onToggle);
  root.appendChild(header);
  root.appendChild(group.body);
  return root;
}

function capitalize(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
