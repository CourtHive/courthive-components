/**
 * Scoring Policy Editor — Observable Store.
 *
 * Mirrors SeedingEditorStore: holds a draft of the policy data plus
 * UI-only state (which sections + status groups are expanded), exposes
 * typed mutator methods so the section views don't reach into the
 * draft shape directly, and emits both an internal subscribe event
 * (panel update) and the config.onChange callback (catalog persistence).
 */

import { emptyScoringPolicy, formatStringOf, asMatchUpFormatEntry } from './domain/scoringProjections';
import type {
  ScoringPolicyData,
  ScoringEditorState,
  ScoringEditorSection,
  ScoringEditorChangeListener,
  ScoringEditorConfig,
  MatchUpStatusKey,
  AllowedFormatField,
  MatchUpFormatEntry,
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

  // Push a fresh blank row — operator fills it in via inline inputs.
  addAllowedFormat(seed?: Partial<MatchUpFormatEntry>): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    draft.matchUpFormats ??= [];
    const entry: MatchUpFormatEntry = { matchUpFormat: '', ...seed };
    draft.matchUpFormats.push(entry);
    this.commitDraft(draft);
  }

  removeAllowedFormat(index: number): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    if (!draft.matchUpFormats) return;
    draft.matchUpFormats.splice(index, 1);
    this.commitDraft(draft);
  }

  // In-place field update. The current entry might be a bare string
  // (legacy shape) — we lift it to the object form before mutating
  // and write the lifted entry back so the saved policy carries the
  // richer fields the MatchUp Format Dialog reads.
  setAllowedFormatField(index: number, field: AllowedFormatField, value: string): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    if (!draft.matchUpFormats?.[index]) return;
    const entry = asMatchUpFormatEntry(draft.matchUpFormats[index]);
    if (field === 'name') entry.name = value;
    else if (field === 'description') entry.description = value;
    else entry.matchUpFormat = value;
    // Drop empty optional fields so the saved policy isn't littered
    // with `name: ""`/`description: ""` keys.
    if (entry.name === '') delete entry.name;
    if (entry.description === '') delete entry.description;
    draft.matchUpFormats[index] = entry;
    this.commitDraft(draft);
  }

  // Suppress the "duplicate format" or other validation checks at the
  // caller's discretion. The store doesn't gate adds because operators
  // routinely paste a preset then edit the format string in place.
  // Use formatStringOf when callers need to de-dup themselves.
  isAllowedFormatDuplicate(format: string, excludeIndex?: number): boolean {
    const trimmed = format.trim();
    if (!trimmed) return false;
    const list = this.state.draft.matchUpFormats ?? [];
    return list.some((entry, i) => i !== excludeIndex && formatStringOf(entry) === trimmed);
  }

  // Add a category filter (name or type) to an allowed-format entry.
  // The entry is lifted to object form if it's still a bare string.
  // De-dupes within the list (trimmed, case-sensitive — TODS category
  // identifiers are case-sensitive in the rest of the engine).
  addAllowedFormatCategory(
    index: number,
    kind: 'categoryNames' | 'categoryTypes',
    value: string,
  ): void {
    if (this.isReadonly()) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const draft = deepClone(this.state.draft);
    if (!draft.matchUpFormats?.[index]) return;
    const entry = asMatchUpFormatEntry(draft.matchUpFormats[index]);
    entry[kind] ??= [];
    if (entry[kind]!.includes(trimmed)) return;
    entry[kind]!.push(trimmed);
    draft.matchUpFormats[index] = entry;
    this.commitDraft(draft);
  }

  removeAllowedFormatCategory(
    index: number,
    kind: 'categoryNames' | 'categoryTypes',
    valueIndex: number,
  ): void {
    if (this.isReadonly()) return;
    const draft = deepClone(this.state.draft);
    const entryRaw = draft.matchUpFormats?.[index];
    if (!entryRaw) return;
    const entry = asMatchUpFormatEntry(entryRaw);
    const list = entry[kind];
    if (!list) return;
    list.splice(valueIndex, 1);
    if (list.length === 0) delete entry[kind];
    draft.matchUpFormats![index] = entry;
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
