/**
 * Participant Privacy Editor — Observable store. Mirrors SeedingEditorStore.
 */
import { emptyPrivacyPolicy, writeField, writePolicyName } from './domain/privacyProjections';
import type { PrivacyEditorChangeListener, PrivacyEditorConfig, PrivacyEditorState, PrivacyPolicyData } from './types';

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

export class PrivacyEditorStore {
  private state: PrivacyEditorState;
  private readonly listeners: Set<PrivacyEditorChangeListener> = new Set();
  private readonly config: PrivacyEditorConfig;

  constructor(config: PrivacyEditorConfig) {
    this.config = config;
    this.state = { draft: deepClone(config.initialPolicy ?? emptyPrivacyPolicy()), dirty: false };
  }

  getState(): PrivacyEditorState {
    return this.state;
  }

  getData(): PrivacyPolicyData {
    return deepClone(this.state.draft);
  }

  setData(data: PrivacyPolicyData): void {
    this.state = { ...this.state, draft: deepClone(data), dirty: false };
    this.emit();
  }

  setPolicyName(value: string): void {
    const draft = deepClone(this.state.draft);
    writePolicyName(draft, value);
    this.commitDraft(draft);
  }

  setField(group: 'participant' | 'person', field: string, value: boolean): void {
    const draft = deepClone(this.state.draft);
    writeField(draft, group, field, value);
    this.commitDraft(draft);
  }

  subscribe(listener: PrivacyEditorChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private commitDraft(draft: PrivacyPolicyData): void {
    this.state = { ...this.state, draft, dirty: true };
    this.emit();
    this.config.onChange?.(deepClone(draft));
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state);
  }
}
