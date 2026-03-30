/**
 * Ranking Points Editor — Observable Store
 *
 * Manages ranking policy draft state. Follows the SchedulingEditorStore pattern.
 */
import { emptyRankingPolicy } from './domain/emptyRankingPolicy';
import type {
  RankingPolicyData,
  RankingPointsEditorState,
  RankingEditorSection,
  RankingPointsEditorChangeListener,
  RankingPointsEditorConfig
} from './types';

function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

export class RankingPointsEditorStore {
  private state: RankingPointsEditorState;
  private readonly listeners: Set<RankingPointsEditorChangeListener> = new Set();
  private readonly config: RankingPointsEditorConfig;

  constructor(config: RankingPointsEditorConfig) {
    this.config = config;

    const draft = deepClone(config.initialPolicy ?? emptyRankingPolicy());
    const profileCount = draft.awardProfiles?.length ?? 0;

    this.state = {
      draft,
      expandedSections: new Set<RankingEditorSection>(
        profileCount > 5 ? ['awardProfiles'] : ['metadata', 'awardProfiles', 'qualityWinProfiles', 'aggregationRules']
      ),
      expandedProfiles: new Set<number>(profileCount <= 5 ? Array.from({ length: profileCount }, (_, i) => i) : []),
      profileFilter: '',
      dirty: false,
      readonly: config.readonly ?? false
    };
  }

  // ---------- Getters ----------

  getState(): RankingPointsEditorState {
    return this.state;
  }

  getData(): RankingPolicyData {
    return deepClone(this.state.draft);
  }

  // ---------- Bulk Load ----------

  setData(data: RankingPolicyData): void {
    const profileCount = data.awardProfiles?.length ?? 0;
    this.state = {
      ...this.state,
      draft: deepClone(data),
      expandedProfiles: new Set<number>(profileCount <= 5 ? Array.from({ length: profileCount }, (_, i) => i) : []),
      profileFilter: '',
      dirty: false
    };
    this.emit();
  }

  // ---------- Section Toggle ----------

  toggleSection(sectionId: RankingEditorSection): void {
    const next = new Set(this.state.expandedSections);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    this.state = { ...this.state, expandedSections: next };
    this.emit();
  }

  // ---------- Profile Toggle ----------

  toggleProfile(index: number): void {
    const next = new Set(this.state.expandedProfiles);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    this.state = { ...this.state, expandedProfiles: next };
    this.emit();
  }

  // ---------- Profile Filter ----------

  setProfileFilter(filter: string): void {
    this.state = { ...this.state, profileFilter: filter };
    this.emit();
  }

  // ---------- Metadata Mutators ----------

  setPolicyName(name: string): void {
    const draft = deepClone(this.state.draft);
    draft.policyName = name;
    this.commitDraft(draft);
  }

  setPolicyVersion(version: string): void {
    const draft = deepClone(this.state.draft);
    draft.policyVersion = version;
    this.commitDraft(draft);
  }

  setValidDateRange(field: 'startDate' | 'endDate', value: string): void {
    const draft = deepClone(this.state.draft);
    if (!draft.validDateRange) draft.validDateRange = {};
    draft.validDateRange[field] = value || undefined;
    this.commitDraft(draft);
  }

  setGlobalFlag(key: 'requireWinForPoints' | 'requireWinFirstRound', value: boolean): void {
    const draft = deepClone(this.state.draft);
    draft[key] = value;
    this.commitDraft(draft);
  }

  setDoublesAttribution(value: string): void {
    const draft = deepClone(this.state.draft);
    draft.doublesAttribution = value || undefined;
    this.commitDraft(draft);
  }

  setCategoryResolution(value: string): void {
    const draft = deepClone(this.state.draft);
    draft.categoryResolution = value || undefined;
    this.commitDraft(draft);
  }

  // ---------- Profile Management ----------

  addProfile(): void {
    const draft = deepClone(this.state.draft);
    if (!draft.awardProfiles) draft.awardProfiles = [];
    draft.awardProfiles.push({
      profileName: `Profile ${draft.awardProfiles.length + 1}`,
      finishingPositionRanges: { 1: 100, 2: 70, 4: 50, 8: 30 }
    });
    // Auto-expand the new profile
    const next = new Set(this.state.expandedProfiles);
    next.add(draft.awardProfiles.length - 1);
    this.state = { ...this.state, expandedProfiles: next };
    this.commitDraft(draft);
  }

  removeProfile(index: number): void {
    const draft = deepClone(this.state.draft);
    if (!draft.awardProfiles || index < 0 || index >= draft.awardProfiles.length) return;
    draft.awardProfiles.splice(index, 1);
    // Adjust expanded profile indices
    const next = new Set<number>();
    for (const i of this.state.expandedProfiles) {
      if (i < index) next.add(i);
      else if (i > index) next.add(i - 1);
    }
    this.state = { ...this.state, expandedProfiles: next };
    this.commitDraft(draft);
  }

  duplicateProfile(index: number): void {
    const draft = deepClone(this.state.draft);
    if (!draft.awardProfiles || index < 0 || index >= draft.awardProfiles.length) return;
    const copy = deepClone(draft.awardProfiles[index]);
    copy.profileName = `${copy.profileName ?? 'Profile'} (Copy)`;
    draft.awardProfiles.splice(index + 1, 0, copy);
    // Adjust expanded profile indices and expand the copy
    const next = new Set<number>();
    for (const i of this.state.expandedProfiles) {
      if (i <= index) next.add(i);
      else next.add(i + 1);
    }
    next.add(index + 1);
    this.state = { ...this.state, expandedProfiles: next };
    this.commitDraft(draft);
  }

  moveProfile(fromIndex: number, toIndex: number): void {
    const draft = deepClone(this.state.draft);
    if (!draft.awardProfiles) return;
    if (fromIndex < 0 || fromIndex >= draft.awardProfiles.length) return;
    if (toIndex < 0 || toIndex >= draft.awardProfiles.length) return;
    const [moved] = draft.awardProfiles.splice(fromIndex, 1);
    draft.awardProfiles.splice(toIndex, 0, moved);
    this.commitDraft(draft);
  }

  // ---------- Profile Field Mutators ----------

  setProfileName(index: number, name: string): void {
    const draft = deepClone(this.state.draft);
    if (!draft.awardProfiles?.[index]) return;
    draft.awardProfiles[index].profileName = name;
    this.commitDraft(draft);
  }

  setProfileFlag(index: number, key: 'requireWinForPoints' | 'requireWinFirstRound', value: boolean | undefined): void {
    const draft = deepClone(this.state.draft);
    if (!draft.awardProfiles?.[index]) return;
    if (value === undefined) {
      delete draft.awardProfiles[index][key];
    } else {
      draft.awardProfiles[index][key] = value;
    }
    this.commitDraft(draft);
  }

  // ---------- Flat Position Points ----------

  setFlatPositionPoints(profileIndex: number, position: number, value: number): void {
    const draft = deepClone(this.state.draft);
    const profile = draft.awardProfiles?.[profileIndex];
    if (!profile) return;
    if (!profile.finishingPositionRanges) profile.finishingPositionRanges = {};
    profile.finishingPositionRanges[position] = value;
    this.commitDraft(draft);
  }

  addPositionRow(profileIndex: number, position: number): void {
    const draft = deepClone(this.state.draft);
    const profile = draft.awardProfiles?.[profileIndex];
    if (!profile) return;
    if (!profile.finishingPositionRanges) profile.finishingPositionRanges = {};
    if (profile.finishingPositionRanges[position] !== undefined) return;
    profile.finishingPositionRanges[position] = 0;
    this.commitDraft(draft);
  }

  removePositionRow(profileIndex: number, position: number): void {
    const draft = deepClone(this.state.draft);
    const profile = draft.awardProfiles?.[profileIndex];
    if (!profile?.finishingPositionRanges) return;
    delete profile.finishingPositionRanges[position];
    this.commitDraft(draft);
  }

  // ---------- Per-Win Points ----------

  setPointsPerWin(profileIndex: number, value: number | undefined): void {
    const draft = deepClone(this.state.draft);
    const profile = draft.awardProfiles?.[profileIndex];
    if (!profile) return;
    if (value === undefined) {
      delete profile.pointsPerWin;
    } else {
      profile.pointsPerWin = value;
    }
    this.commitDraft(draft);
  }

  // ---------- Bonus Points ----------

  addBonusPoint(profileIndex: number): void {
    const draft = deepClone(this.state.draft);
    const profile = draft.awardProfiles?.[profileIndex];
    if (!profile) return;
    if (!profile.bonusPoints) profile.bonusPoints = [];
    profile.bonusPoints.push({ finishingPositions: [1], value: 0 });
    this.commitDraft(draft);
  }

  removeBonusPoint(profileIndex: number, bonusIndex: number): void {
    const draft = deepClone(this.state.draft);
    const profile = draft.awardProfiles?.[profileIndex];
    if (!profile?.bonusPoints) return;
    profile.bonusPoints.splice(bonusIndex, 1);
    if (!profile.bonusPoints.length) delete profile.bonusPoints;
    this.commitDraft(draft);
  }

  setBonusPointPositions(profileIndex: number, bonusIndex: number, positions: number[]): void {
    const draft = deepClone(this.state.draft);
    const bp = draft.awardProfiles?.[profileIndex]?.bonusPoints?.[bonusIndex];
    if (!bp) return;
    bp.finishingPositions = positions;
    this.commitDraft(draft);
  }

  setBonusPointValue(profileIndex: number, bonusIndex: number, value: number): void {
    const draft = deepClone(this.state.draft);
    const bp = draft.awardProfiles?.[profileIndex]?.bonusPoints?.[bonusIndex];
    if (!bp) return;
    bp.value = value;
    this.commitDraft(draft);
  }

  // ---------- Level-Keyed Position Points ----------

  setLevelPositionPoints(profileIndex: number, position: number, level: number, value: number): void {
    const draft = deepClone(this.state.draft);
    const profile = draft.awardProfiles?.[profileIndex];
    if (!profile) return;
    if (!profile.finishingPositionRanges) profile.finishingPositionRanges = {};
    const posValue = profile.finishingPositionRanges[position];
    if (posValue && typeof posValue === 'object' && posValue.level) {
      posValue.level[level] = value;
    }
    this.commitDraft(draft);
  }

  addLevel(profileIndex: number, level: number): void {
    const draft = deepClone(this.state.draft);
    const profile = draft.awardProfiles?.[profileIndex];
    if (!profile?.finishingPositionRanges) return;
    for (const pos of Object.keys(profile.finishingPositionRanges)) {
      const val = profile.finishingPositionRanges[pos];
      // eslint-disable-next-line sonarjs/no-collapsible-if
      if (val && typeof val === 'object' && val.level) {
        if (val.level[level] === undefined) val.level[level] = 0;
      }
    }
    // Also add to profile.levels scope if present
    if (profile.levels && !profile.levels.includes(level)) {
      profile.levels.push(level);
      profile.levels.sort((a, b) => a - b);
    }
    this.commitDraft(draft);
  }

  removeLevel(profileIndex: number, level: number): void {
    const draft = deepClone(this.state.draft);
    const profile = draft.awardProfiles?.[profileIndex];
    if (!profile?.finishingPositionRanges) return;
    for (const pos of Object.keys(profile.finishingPositionRanges)) {
      const val = profile.finishingPositionRanges[pos];
      if (val && typeof val === 'object' && val.level) {
        delete val.level[level];
      }
    }
    if (profile.levels) {
      profile.levels = profile.levels.filter((l) => l !== level);
    }
    this.commitDraft(draft);
  }

  // ---------- Profile Scope ----------

  setProfileScope(profileIndex: number, field: string, values: any[]): void {
    const draft = deepClone(this.state.draft);
    const profile = draft.awardProfiles?.[profileIndex];
    if (!profile) return;
    if (values.length) {
      (profile as any)[field] = values;
    } else {
      delete (profile as any)[field];
    }
    this.commitDraft(draft);
  }

  setProfileField(profileIndex: number, field: string, value: any): void {
    const draft = deepClone(this.state.draft);
    const profile = draft.awardProfiles?.[profileIndex];
    if (!profile) return;
    if (value === undefined || value === '') {
      delete (profile as any)[field];
    } else {
      (profile as any)[field] = value;
    }
    this.commitDraft(draft);
  }

  // ---------- Quality Win Profiles ----------

  addQualityWinProfile(): void {
    const draft = deepClone(this.state.draft);
    if (!draft.qualityWinProfiles) draft.qualityWinProfiles = [];
    draft.qualityWinProfiles.push({
      rankingScaleName: 'New Profile',
      rankingRanges: [{ rankRange: [1, 10], value: 10 }]
    });
    this.commitDraft(draft);
  }

  removeQualityWinProfile(index: number): void {
    const draft = deepClone(this.state.draft);
    if (!draft.qualityWinProfiles) return;
    draft.qualityWinProfiles.splice(index, 1);
    if (!draft.qualityWinProfiles.length) delete draft.qualityWinProfiles;
    this.commitDraft(draft);
  }

  setQualityWinField(index: number, field: string, value: any): void {
    const draft = deepClone(this.state.draft);
    const qw = draft.qualityWinProfiles?.[index];
    if (!qw) return;
    if (value === undefined || value === '') {
      delete (qw as any)[field];
    } else {
      (qw as any)[field] = value;
    }
    this.commitDraft(draft);
  }

  addQualityWinRange(profileIndex: number): void {
    const draft = deepClone(this.state.draft);
    const qw = draft.qualityWinProfiles?.[profileIndex];
    if (!qw) return;
    const last = qw.rankingRanges.at(-1);
    const nextStart = last ? last.rankRange[1] + 1 : 1;
    qw.rankingRanges.push({ rankRange: [nextStart, nextStart + 9], value: 0 });
    this.commitDraft(draft);
  }

  removeQualityWinRange(profileIndex: number, rangeIndex: number): void {
    const draft = deepClone(this.state.draft);
    const qw = draft.qualityWinProfiles?.[profileIndex];
    if (!qw) return;
    qw.rankingRanges.splice(rangeIndex, 1);
    this.commitDraft(draft);
  }

  setQualityWinRange(profileIndex: number, rangeIndex: number, field: 'rankRange' | 'value', value: any): void {
    const draft = deepClone(this.state.draft);
    const range = draft.qualityWinProfiles?.[profileIndex]?.rankingRanges?.[rangeIndex];
    if (!range) return;
    if (field === 'rankRange') {
      range.rankRange = value;
    } else {
      range.value = value;
    }
    this.commitDraft(draft);
  }

  // ---------- Aggregation Rules ----------

  setAggregationField(field: string, value: any): void {
    const draft = deepClone(this.state.draft);
    if (!draft.aggregationRules) draft.aggregationRules = {};
    if (value === undefined || value === '') {
      delete (draft.aggregationRules as any)[field];
    } else {
      (draft.aggregationRules as any)[field] = value;
    }
    this.commitDraft(draft);
  }

  addTiebreakCriterion(criterion: string): void {
    const draft = deepClone(this.state.draft);
    if (!draft.aggregationRules) draft.aggregationRules = {};
    if (!draft.aggregationRules.tiebreakCriteria) draft.aggregationRules.tiebreakCriteria = [];
    draft.aggregationRules.tiebreakCriteria.push(criterion);
    this.commitDraft(draft);
  }

  removeTiebreakCriterion(index: number): void {
    const draft = deepClone(this.state.draft);
    if (!draft.aggregationRules?.tiebreakCriteria) return;
    draft.aggregationRules.tiebreakCriteria.splice(index, 1);
    if (!draft.aggregationRules.tiebreakCriteria.length) delete draft.aggregationRules.tiebreakCriteria;
    this.commitDraft(draft);
  }

  addCountingBucket(): void {
    const draft = deepClone(this.state.draft);
    if (!draft.aggregationRules) draft.aggregationRules = {};
    if (!draft.aggregationRules.countingBuckets) draft.aggregationRules.countingBuckets = [];
    draft.aggregationRules.countingBuckets.push({ bucketName: 'New Bucket' });
    this.commitDraft(draft);
  }

  removeCountingBucket(index: number): void {
    const draft = deepClone(this.state.draft);
    if (!draft.aggregationRules?.countingBuckets) return;
    draft.aggregationRules.countingBuckets.splice(index, 1);
    if (!draft.aggregationRules.countingBuckets.length) delete draft.aggregationRules.countingBuckets;
    this.commitDraft(draft);
  }

  setCountingBucketField(index: number, field: string, value: any): void {
    const draft = deepClone(this.state.draft);
    const bucket = draft.aggregationRules?.countingBuckets?.[index];
    if (!bucket) return;
    if (value === undefined || value === '') {
      delete (bucket as any)[field];
    } else {
      (bucket as any)[field] = value;
    }
    this.commitDraft(draft);
  }

  // ---------- Subscription ----------

  subscribe(listener: RankingPointsEditorChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ---------- Internal ----------

  private commitDraft(draft: RankingPolicyData): void {
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
