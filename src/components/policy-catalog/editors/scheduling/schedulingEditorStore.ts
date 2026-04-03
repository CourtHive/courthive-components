/**
 * Scheduling Policy Editor — Observable Store
 *
 * Manages scheduling policy draft state. Fully self-contained — no dependency
 * on PolicyCatalogStore. Follows ProfileStore pattern.
 */

import { emptySchedulingPolicy } from './domain/schedulingProjections';
import type {
  SchedulingPolicyData,
  SchedulingEditorState,
  SchedulingEditorSection,
  SchedulingEditorChangeListener,
  SchedulingEditorConfig,
  AverageTimeEntry,
  RecoveryTimeEntry
} from './types';

function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

export class SchedulingEditorStore {
  private state: SchedulingEditorState;
  private readonly listeners: Set<SchedulingEditorChangeListener> = new Set();
  private readonly config: SchedulingEditorConfig;

  constructor(config: SchedulingEditorConfig) {
    this.config = config;

    this.state = {
      draft: deepClone(config.initialPolicy ?? emptySchedulingPolicy()),
      expandedSections: new Set<SchedulingEditorSection>([
        'modificationFlags',
        'dailyLimits',
        'defaultTimes',
        'averageTimes',
        'recoveryTimes'
      ]),
      dirty: false
    };
  }

  // ---------- Getters ----------

  getState(): SchedulingEditorState {
    return this.state;
  }

  getData(): SchedulingPolicyData {
    return deepClone(this.state.draft);
  }

  // ---------- Bulk Load ----------

  setData(data: SchedulingPolicyData): void {
    this.state = {
      ...this.state,
      draft: deepClone(data),
      dirty: false
    };
    this.emit();
  }

  // ---------- Section Toggle ----------

  toggleSection(sectionId: SchedulingEditorSection): void {
    const next = new Set(this.state.expandedSections);
    if (next.has(sectionId)) {
      next.delete(sectionId);
    } else {
      next.add(sectionId);
    }
    this.state = { ...this.state, expandedSections: next };
    this.emit();
  }

  // ---------- Field Setters ----------

  setModificationFlag(key: 'courts' | 'venues', value: boolean): void {
    const draft = deepClone(this.state.draft);
    if (!draft.allowModificationWhenMatchUpsScheduled) {
      draft.allowModificationWhenMatchUpsScheduled = { courts: false, venues: false };
    }
    draft.allowModificationWhenMatchUpsScheduled[key] = value;
    this.commitDraft(draft);
  }

  setDailyLimit(key: 'SINGLES' | 'DOUBLES' | 'total', value: number): void {
    const draft = deepClone(this.state.draft);
    if (!draft.defaultDailyLimits) {
      draft.defaultDailyLimits = {};
    }
    draft.defaultDailyLimits[key] = value;
    this.commitDraft(draft);
  }

  setDefaultAverageTime(index: number, field: 'default' | 'DOUBLES', value: number | undefined): void {
    const draft = deepClone(this.state.draft);
    if (!draft.defaultTimes) draft.defaultTimes = {};
    if (!draft.defaultTimes.averageTimes) {
      draft.defaultTimes.averageTimes = [{ categoryNames: [], minutes: { default: 90 } }];
    }
    const entry = draft.defaultTimes.averageTimes[index];
    if (!entry) return;
    if (field === 'DOUBLES') {
      if (value === undefined) {
        delete entry.minutes.DOUBLES;
      } else {
        entry.minutes.DOUBLES = value;
      }
    } else {
      entry.minutes.default = value ?? 0;
    }
    this.commitDraft(draft);
  }

  setDefaultRecoveryTime(index: number, field: 'default' | 'DOUBLES', value: number | undefined): void {
    const draft = deepClone(this.state.draft);
    if (!draft.defaultTimes) draft.defaultTimes = {};
    if (!draft.defaultTimes.recoveryTimes) {
      draft.defaultTimes.recoveryTimes = [{ minutes: { default: 60 } }];
    }
    const entry = draft.defaultTimes.recoveryTimes[index];
    if (!entry) return;
    if (field === 'DOUBLES') {
      if (value === undefined) {
        delete entry.minutes.DOUBLES;
      } else {
        entry.minutes.DOUBLES = value;
      }
    } else {
      entry.minutes.default = value ?? 0;
    }
    this.commitDraft(draft);
  }

  // ---------- Format Group Operations (Average Times) ----------

  addAverageFormatGroup(): void {
    const draft = deepClone(this.state.draft);
    if (!draft.matchUpAverageTimes) draft.matchUpAverageTimes = [];
    draft.matchUpAverageTimes.push({
      matchUpFormatCodes: [],
      averageTimes: [{ categoryNames: [], minutes: { default: 60 } }]
    });
    this.commitDraft(draft);
  }

  removeAverageFormatGroup(index: number): void {
    const draft = deepClone(this.state.draft);
    if (!draft.matchUpAverageTimes) return;
    draft.matchUpAverageTimes.splice(index, 1);
    this.commitDraft(draft);
  }

  setAverageFormatCodes(groupIndex: number, codes: string[]): void {
    const draft = deepClone(this.state.draft);
    const group = draft.matchUpAverageTimes?.[groupIndex];
    if (!group) return;
    group.matchUpFormatCodes = codes;
    this.commitDraft(draft);
  }

  setAverageTime(
    groupIndex: number,
    overrideIndex: number,
    field: 'default' | 'DOUBLES',
    value: number | undefined
  ): void {
    const draft = deepClone(this.state.draft);
    const entry = draft.matchUpAverageTimes?.[groupIndex]?.averageTimes?.[overrideIndex];
    if (!entry) return;
    if (field === 'DOUBLES') {
      if (value === undefined) delete entry.minutes.DOUBLES;
      else entry.minutes.DOUBLES = value;
    } else {
      entry.minutes.default = value ?? 0;
    }
    this.commitDraft(draft);
  }

  addAverageCategoryOverride(groupIndex: number): void {
    const draft = deepClone(this.state.draft);
    const group = draft.matchUpAverageTimes?.[groupIndex];
    if (!group) return;
    group.averageTimes.push({ categoryTypes: [], minutes: { default: 60 } });
    this.commitDraft(draft);
  }

  removeAverageCategoryOverride(groupIndex: number, overrideIndex: number): void {
    const draft = deepClone(this.state.draft);
    const group = draft.matchUpAverageTimes?.[groupIndex];
    if (!group) return;
    group.averageTimes.splice(overrideIndex, 1);
    this.commitDraft(draft);
  }

  setAverageOverrideCategories(
    groupIndex: number,
    overrideIndex: number,
    key: 'categoryNames' | 'categoryTypes',
    values: string[]
  ): void {
    const draft = deepClone(this.state.draft);
    const entry = draft.matchUpAverageTimes?.[groupIndex]?.averageTimes?.[overrideIndex];
    if (!entry) return;
    // Clear the other key if switching
    if (key === 'categoryNames') {
      delete (entry as AverageTimeEntry).categoryTypes;
      entry.categoryNames = values;
    } else {
      delete (entry as AverageTimeEntry).categoryNames;
      entry.categoryTypes = values;
    }
    this.commitDraft(draft);
  }

  // ---------- Format Group Operations (Recovery Times) ----------

  addRecoveryFormatGroup(): void {
    const draft = deepClone(this.state.draft);
    if (!draft.matchUpRecoveryTimes) draft.matchUpRecoveryTimes = [];
    draft.matchUpRecoveryTimes.push({
      matchUpFormatCodes: [],
      recoveryTimes: [{ categoryNames: [], minutes: { default: 30 } }]
    });
    this.commitDraft(draft);
  }

  removeRecoveryFormatGroup(index: number): void {
    const draft = deepClone(this.state.draft);
    if (!draft.matchUpRecoveryTimes) return;
    draft.matchUpRecoveryTimes.splice(index, 1);
    this.commitDraft(draft);
  }

  setRecoveryFormatCodes(groupIndex: number, codes: string[]): void {
    const draft = deepClone(this.state.draft);
    const group = draft.matchUpRecoveryTimes?.[groupIndex];
    if (!group) return;
    group.matchUpFormatCodes = codes;
    this.commitDraft(draft);
  }

  setRecoveryTime(
    groupIndex: number,
    overrideIndex: number,
    field: 'default' | 'DOUBLES',
    value: number | undefined
  ): void {
    const draft = deepClone(this.state.draft);
    const entry = draft.matchUpRecoveryTimes?.[groupIndex]?.recoveryTimes?.[overrideIndex];
    if (!entry) return;
    if (field === 'DOUBLES') {
      if (value === undefined) delete entry.minutes.DOUBLES;
      else entry.minutes.DOUBLES = value;
    } else {
      entry.minutes.default = value ?? 0;
    }
    this.commitDraft(draft);
  }

  addRecoveryCategoryOverride(groupIndex: number): void {
    const draft = deepClone(this.state.draft);
    const group = draft.matchUpRecoveryTimes?.[groupIndex];
    if (!group) return;
    group.recoveryTimes.push({ categoryTypes: [], minutes: { default: 30 } });
    this.commitDraft(draft);
  }

  removeRecoveryCategoryOverride(groupIndex: number, overrideIndex: number): void {
    const draft = deepClone(this.state.draft);
    const group = draft.matchUpRecoveryTimes?.[groupIndex];
    if (!group) return;
    group.recoveryTimes.splice(overrideIndex, 1);
    this.commitDraft(draft);
  }

  setRecoveryOverrideCategories(
    groupIndex: number,
    overrideIndex: number,
    key: 'categoryNames' | 'categoryTypes',
    values: string[]
  ): void {
    const draft = deepClone(this.state.draft);
    const entry = draft.matchUpRecoveryTimes?.[groupIndex]?.recoveryTimes?.[overrideIndex];
    if (!entry) return;
    if (key === 'categoryNames') {
      delete (entry as RecoveryTimeEntry).categoryTypes;
      entry.categoryNames = values;
    } else {
      delete (entry as RecoveryTimeEntry).categoryNames;
      entry.categoryTypes = values;
    }
    this.commitDraft(draft);
  }

  // ---------- Subscription ----------

  subscribe(listener: SchedulingEditorChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ---------- Internal ----------

  private commitDraft(draft: SchedulingPolicyData): void {
    this.state = { ...this.state, draft, dirty: true };
    this.emit();
    this.config.onChange?.(deepClone(draft));
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
