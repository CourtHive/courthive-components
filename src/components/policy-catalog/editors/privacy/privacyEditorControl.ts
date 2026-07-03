/**
 * Participant Privacy Editor Control — standalone controller (reusable without
 * the catalog). Mirrors SeedingEditorControl.
 */
import { PrivacyEditorStore } from './privacyEditorStore';
import { buildPrivacyEditorPanel } from './privacyEditorPanel';
import type { PrivacyEditorConfig, PrivacyPolicyData } from './types';
import type { PolicyEditorInstance as CatalogEditorInstance } from '../../types';

export class PrivacyEditorControl {
  private readonly store: PrivacyEditorStore;
  private readonly panel: { element: HTMLElement; update: (state: any) => void };
  private readonly unsubscribe: () => void;
  private container: HTMLElement | null = null;

  constructor(config: PrivacyEditorConfig) {
    this.store = new PrivacyEditorStore(config);
    this.panel = buildPrivacyEditorPanel(this.store, config);
    this.unsubscribe = this.store.subscribe((state) => this.panel.update(state));
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

  getData(): PrivacyPolicyData {
    return this.store.getData();
  }

  setData(data: PrivacyPolicyData): void {
    this.store.setData(data);
  }

  getStore(): PrivacyEditorStore {
    return this.store;
  }

  static createEditorInstance(config: {
    initialData: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
  }): CatalogEditorInstance {
    const editorConfig: PrivacyEditorConfig = {
      initialPolicy: config.initialData as PrivacyPolicyData,
      onChange: (policy) => config.onChange(policy as Record<string, unknown>),
    };
    const control = new PrivacyEditorControl(editorConfig);
    return {
      element: control.panel.element,
      setData(data: Record<string, unknown>) {
        control.setData(data as PrivacyPolicyData);
      },
      getData() {
        return control.getData() as Record<string, unknown>;
      },
      destroy() {
        control.destroy();
      },
    };
  }
}

export function createPrivacyEditor(config: PrivacyEditorConfig, container: HTMLElement): PrivacyEditorControl {
  const control = new PrivacyEditorControl(config);
  control.render(container);
  return control;
}
