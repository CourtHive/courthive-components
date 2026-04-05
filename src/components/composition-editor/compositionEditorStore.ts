import type { Configuration } from '../../types';
import type {
  CompositionEditorConfig,
  CompositionEditorState,
  CompositionEditorListener,
  SectionId
} from './compositionEditorTypes';

export class CompositionEditorStore {
  private state: CompositionEditorState;
  private readonly listeners: Set<CompositionEditorListener> = new Set();
  private readonly config: CompositionEditorConfig;

  constructor(config: CompositionEditorConfig) {
    this.config = config;
    this.state = {
      compositionName: config.compositionName || 'Custom',
      theme: config.composition?.theme || '',
      configuration: { ...(config.composition?.configuration || {}) },
      expandedSections: new Set<SectionId>(['theme', 'display']),
      isDirty: false,
      readOnly: config.readOnly || false
    };
  }

  getState(): CompositionEditorState {
    return this.state;
  }

  subscribe(listener: CompositionEditorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Section toggle ──
  toggleSection(sectionId: SectionId): void {
    const next = new Set(this.state.expandedSections);
    if (next.has(sectionId)) {
      next.delete(sectionId);
    } else {
      next.add(sectionId);
    }
    this.setState({ expandedSections: next });
  }

  // ── Theme ──
  setTheme(theme: string): void {
    this.setState({ theme, isDirty: true });
    this.notifyChange();
  }

  // ── Name ──
  setCompositionName(name: string): void {
    this.setState({ compositionName: name, isDirty: true });
  }

  // ── Configuration field updates ──
  setConfigField<K extends keyof Configuration>(key: K, value: Configuration[K]): void {
    const configuration = { ...this.state.configuration, [key]: value };
    this.setState({ configuration, isDirty: true });
    this.notifyChange();
  }

  /** Update a nested object field (e.g., gameScore, placeHolders, scaleAttributes) */
  setConfigNestedField<K extends keyof Configuration>(key: K, nestedKey: string, value: unknown): void {
    const existing = (this.state.configuration[key] as Record<string, unknown>) || {};
    const updated = { ...existing, [nestedKey]: value };
    this.setConfigField(key, updated as Configuration[K]);
  }

  /** Replace the entire configuration (e.g., loading a preset) */
  setConfiguration(configuration: Configuration): void {
    this.setState({ configuration: { ...configuration }, isDirty: true });
    this.notifyChange();
  }

  /** Load a full composition (theme + config + name) */
  loadComposition(name: string, theme: string, configuration: Configuration): void {
    this.setState({
      compositionName: name,
      theme,
      configuration: { ...configuration },
      isDirty: false
    });
    this.notifyChange();
  }

  // ── Reset ──
  resetToInitial(): void {
    this.setState({
      compositionName: this.config.compositionName || 'Custom',
      theme: this.config.composition?.theme || '',
      configuration: { ...(this.config.composition?.configuration || {}) },
      isDirty: false
    });
    this.notifyChange();
  }

  // ── Internal ──
  private setState(partial: Partial<CompositionEditorState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private notifyChange(): void {
    this.config.onChange?.({
      theme: this.state.theme,
      configuration: this.state.configuration
    });
  }
}
