/**
 * Seeding Policy Editor — Observable Store
 *
 * Manages seeding policy draft state. Follows the SchedulingEditorStore pattern.
 */

import { emptySeedingPolicy } from './domain/seedingProjections';
import type {
  SeedingPolicyData,
  SeedingEditorState,
  SeedingEditorSection,
  SeedingEditorChangeListener,
  SeedingEditorConfig,
  SeedsCountThreshold,
  SeedingPositioning
} from './types';

function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

export class SeedingEditorStore {
  private state: SeedingEditorState;
  private readonly listeners: Set<SeedingEditorChangeListener> = new Set();
  private readonly config: SeedingEditorConfig;

  constructor(config: SeedingEditorConfig) {
    this.config = config;

    this.state = {
      draft: deepClone(config.initialPolicy ?? emptySeedingPolicy()),
      expandedSections: new Set<SeedingEditorSection>(['profile', 'flags', 'thresholds', 'drawTypeOverrides']),
      dirty: false
    };
  }

  getState(): SeedingEditorState {
    return this.state;
  }

  getData(): SeedingPolicyData {
    return deepClone(this.state.draft);
  }

  setData(data: SeedingPolicyData): void {
    this.state = { ...this.state, draft: deepClone(data), dirty: false };
    this.emit();
  }

  toggleSection(sectionId: SeedingEditorSection): void {
    const next = new Set(this.state.expandedSections);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    this.state = { ...this.state, expandedSections: next };
    this.emit();
  }

  // ---------- Profile ----------

  setPolicyName(value: string): void {
    const draft = deepClone(this.state.draft);
    draft.policyName = value;
    this.commitDraft(draft);
  }

  setPositioning(value: SeedingPositioning): void {
    const draft = deepClone(this.state.draft);
    draft.seedingProfile ??= {};
    draft.seedingProfile.positioning = value;
    this.commitDraft(draft);
  }

  // ---------- Flags ----------

  setValidSeedPositionsIgnore(value: boolean): void {
    const draft = deepClone(this.state.draft);
    draft.validSeedPositions = { ignore: value };
    this.commitDraft(draft);
  }

  setDuplicateSeedNumbers(value: boolean): void {
    const draft = deepClone(this.state.draft);
    draft.duplicateSeedNumbers = value;
    this.commitDraft(draft);
  }

  setDrawSizeProgression(value: boolean): void {
    const draft = deepClone(this.state.draft);
    draft.drawSizeProgression = value;
    this.commitDraft(draft);
  }

  // ---------- Thresholds ----------

  addThreshold(): void {
    const draft = deepClone(this.state.draft);
    draft.seedsCountThresholds ??= [];
    const last = draft.seedsCountThresholds.at(-1);
    const nextDrawSize = last ? last.drawSize * 2 : 4;
    draft.seedsCountThresholds.push({
      drawSize: nextDrawSize,
      minimumParticipantCount: Math.max(1, Math.floor(nextDrawSize * 0.75)),
      seedsCount: Math.max(2, Math.floor(nextDrawSize / 4))
    });
    this.commitDraft(draft);
  }

  removeThreshold(index: number): void {
    const draft = deepClone(this.state.draft);
    if (!draft.seedsCountThresholds) return;
    draft.seedsCountThresholds.splice(index, 1);
    this.commitDraft(draft);
  }

  setThresholdField(index: number, field: keyof SeedsCountThreshold, value: number): void {
    const draft = deepClone(this.state.draft);
    const row = draft.seedsCountThresholds?.[index];
    if (!row) return;
    row[field] = value;
    this.commitDraft(draft);
  }

  sortThresholds(): void {
    const draft = deepClone(this.state.draft);
    if (!draft.seedsCountThresholds) return;
    draft.seedsCountThresholds.sort((a, b) => a.drawSize - b.drawSize);
    this.commitDraft(draft);
  }

  // ---------- Draw Type Overrides ----------

  addDrawTypeOverride(drawType: string, positioning: SeedingPositioning): void {
    if (!drawType) return;
    const draft = deepClone(this.state.draft);
    draft.seedingProfile ??= {};
    draft.seedingProfile.drawTypes ??= {};
    draft.seedingProfile.drawTypes[drawType] = { positioning };
    this.commitDraft(draft);
  }

  removeDrawTypeOverride(drawType: string): void {
    const draft = deepClone(this.state.draft);
    if (!draft.seedingProfile?.drawTypes) return;
    delete draft.seedingProfile.drawTypes[drawType];
    if (Object.keys(draft.seedingProfile.drawTypes).length === 0) {
      delete draft.seedingProfile.drawTypes;
    }
    this.commitDraft(draft);
  }

  setDrawTypeOverridePositioning(drawType: string, positioning: SeedingPositioning): void {
    const draft = deepClone(this.state.draft);
    const drawTypes = draft.seedingProfile?.drawTypes;
    if (!drawTypes?.[drawType]) return;
    drawTypes[drawType] = { positioning };
    this.commitDraft(draft);
  }

  // ---------- Subscription ----------

  subscribe(listener: SeedingEditorChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private commitDraft(draft: SeedingPolicyData): void {
    this.state = { ...this.state, draft, dirty: true };
    this.emit();
    this.config.onChange?.(deepClone(draft));
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state);
  }
}
