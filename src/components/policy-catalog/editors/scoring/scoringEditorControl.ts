/**
 * Scoring Editor Control — standalone controller (reusable without the
 * catalog) plus the createEditorInstance factory the catalog uses to
 * inject typed editors into its right pane.
 *
 * Mirrors SeedingEditorControl / SchedulingEditorControl.
 */

import './scoring-editor.css';

import { ScoringEditorStore } from './scoringEditorStore';
import { buildScoringEditorPanel } from './scoringEditorPanel';
import type { ScoringPolicyData, ScoringEditorConfig } from './types';
import type { PolicyEditorInstance as CatalogEditorInstance } from '../../types';

export class ScoringEditorControl {
  private readonly store: ScoringEditorStore;
  private readonly panel: { element: HTMLElement; update: (state: any) => void };
  private readonly unsubscribe: () => void;
  private container: HTMLElement | null = null;

  constructor(config: ScoringEditorConfig) {
    this.store = new ScoringEditorStore(config);
    this.panel = buildScoringEditorPanel(this.store);

    this.unsubscribe = this.store.subscribe((state) => {
      this.panel.update(state);
    });

    this.panel.update(this.store.getState());
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.appendChild(this.panel.element);
  }

  destroy(): void {
    this.unsubscribe();
    if (this.container && this.panel.element.parentNode === this.container) {
      this.container.removeChild(this.panel.element);
    }
    this.container = null;
  }

  getData(): ScoringPolicyData {
    return this.store.getData();
  }

  setData(data: ScoringPolicyData): void {
    this.store.setData(data);
  }

  getStore(): ScoringEditorStore {
    return this.store;
  }

  static createEditorInstance(config: {
    initialData: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
    readonly?: boolean;
  }): CatalogEditorInstance {
    const editorConfig: ScoringEditorConfig = {
      initialPolicy: config.initialData as unknown as ScoringPolicyData,
      readonly: config.readonly,
      onChange: (policy) => config.onChange(policy as unknown as Record<string, unknown>),
    };

    const control = new ScoringEditorControl(editorConfig);

    return {
      element: control.panel.element,
      setData(data: Record<string, unknown>) {
        control.setData(data as unknown as ScoringPolicyData);
      },
      getData() {
        return control.getData() as unknown as Record<string, unknown>;
      },
      destroy() {
        control.destroy();
      },
    };
  }
}

export function createScoringEditor(
  config: ScoringEditorConfig,
  container: HTMLElement,
): ScoringEditorControl {
  const control = new ScoringEditorControl(config);
  control.render(container);
  return control;
}
