/**
 * Scoring Policy Editor — Observable Store.
 *
 * Mirrors SeedingEditorStore: holds a draft of the policy data plus
 * UI-only state (which sections + status groups are expanded), exposes
 * typed mutator methods so the section views don't reach into the
 * draft shape directly, and emits both an internal subscribe event
 * (panel update) and the config.onChange callback (catalog persistence).
 */

import { emptyScoringPolicy, formatStringOf } from './domain/scoringProjections';
import type {
  ScoringPolicyData,
  ScoringEditorState,
  ScoringEditorSection,
  ScoringEditorChangeListener,
  ScoringEditorConfig,
  MatchUpStatusKey,
} from './types';

function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

export class ScoringEditorStore {
  private state: ScoringEditorState;
  private readonly listeners: Set<ScoringEditorChangeListener> = new Set();
  private readonly config: ScoringEditorConfig;

  constructor(config: ScoringEditorConfig) {
    this.config = config;
    this.state = {
      draft: deepClone(config.initialPolicy ?? emptyScoringPolicy()),
      expandedSections: new Set<ScoringEditorSection>(['defaults', 'allowedFormats']),
      expandedStatuses: new Set<MatchUpStatusKey>(),
      advancedOpen: false,
      dirty: false,
    };
  }

  isReadonly(): boolean {
    return this.config.readonly === true;
  }

  getState(): ScoringEditorState {
    return this.state;
  }

  getData(): ScoringPolicyData {
    return deepClone(this.state.draft);
  }

  setData(data: ScoringPolicyData): void {
    this.state = { ...this.state, draft: deepClone(data), dirty: false };
    this.emit();
  }

  // ───── UI state ─────────────────────────────────────────

  toggleSection(sectionId: ScoringEditorSection): void {
    const next = new Set(this.state.expandedSections);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    this.state = { ...this.state, expandedSections: next };
    this.emit();
  }

  toggleStatus(key: MatchUpStatusKey): void {
    const next = new Set(this.state.expandedStatuses);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.state = { ...this.state, expandedStatuses: next };
    this.emit();
  }

  setAdvancedOpen(value: boolean): void {
    if (this.state.advancedOpen === value) return;
    this.state = { ...this.state, advancedOpen: value };
    this.emit();
  }

  // ───── Defaults section ─────────────────────────────────

  setDefaultMatchUpFormat(value: string): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    draft.defaultMatchUpFormat = value;
    this.commitDraft(draft);
  }

  setRequireParticipants(value: boolean): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    draft.requireParticipantsForScoring = value;
    this.commitDraft(draft);
  }

  // tri-state: 'default' (delete the key), 'true', 'false'
  setRequireAllPositions(value: 'default' | 'true' | 'false'): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    if (value === 'default') delete draft.requireAllPositionsAssigned;
    else draft.requireAllPositionsAssigned = value === 'true';
    this.commitDraft(draft);
  }

  setAllowChangePropagation(value: boolean): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    draft.allowChangePropagation = value;
    this.commitDraft(draft);
  }

  setAllowDeletionDraws(value: boolean): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    draft.allowDeletionWithScoresPresent ??= {};
    draft.allowDeletionWithScoresPresent.drawDefinitions = value;
    this.commitDraft(draft);
  }

  setAllowDeletionStructures(value: boolean): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    draft.allowDeletionWithScoresPresent ??= {};
    draft.allowDeletionWithScoresPresent.structures = value;
    this.commitDraft(draft);
  }

  // ───── Allowed match-up formats ────────────────────────

  addAllowedFormat(value: string): void {
    if (this.isReadonly()) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const draft = deepClone(this.state.draft);
    draft.matchUpFormats ??= [];
    // De-dup against either shape (string or object entry).
    const exists = draft.matchUpFormats.some((entry) => formatStringOf(entry) === trimmed);
    if (exists) return;
    // Write the richer factory shape so the saved policy round-trips
    // cleanly with the rest of the catalog (TMX's built-in policy uses
    // { matchUpFormat, description? } entries).
    draft.matchUpFormats.push({ matchUpFormat: trimmed });
    this.commitDraft(draft);
  }

  removeAllowedFormat(index: number): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    if (!draft.matchUpFormats) return;
    draft.matchUpFormats.splice(index, 1);
    this.commitDraft(draft);
  }

  // ───── Status code refinements ─────────────────────────

  addStatusCode(status: MatchUpStatusKey, value: string): void {
    if (this.isReadonly()) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const draft = deepClone(this.state.draft);
    draft.matchUpStatusCodes ??= {};
    draft.matchUpStatusCodes[status] ??= [];
    if (draft.matchUpStatusCodes[status]!.includes(trimmed)) return;
    draft.matchUpStatusCodes[status]!.push(trimmed);
    this.commitDraft(draft);
  }

  removeStatusCode(status: MatchUpStatusKey, index: number): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    const list = draft.matchUpStatusCodes?.[status];
    if (!list) return;
    list.splice(index, 1);
    this.commitDraft(draft);
  }

  // ───── Advanced: process codes ─────────────────────────

  addProcessCode(value: string): void {
    if (this.isReadonly()) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const draft = deepClone(this.state.draft);
    draft.processCodes ??= {};
    draft.processCodes.incompleteAssignmentsOnDefault ??= [];
    if (draft.processCodes.incompleteAssignmentsOnDefault.includes(trimmed)) return;
    draft.processCodes.incompleteAssignmentsOnDefault.push(trimmed);
    this.commitDraft(draft);
  }

  removeProcessCode(index: number): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    const list = draft.processCodes?.incompleteAssignmentsOnDefault;
    if (!list) return;
    list.splice(index, 1);
    this.commitDraft(draft);
  }

  // ───── Subscription ────────────────────────────────────

  subscribe(listener: ScoringEditorChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private commitDraft(draft: ScoringPolicyData): void {
    this.state = { ...this.state, draft, dirty: true };
    this.emit();
    this.config.onChange?.(deepClone(draft));
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state);
  }
}
