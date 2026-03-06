/**
 * Scheduling Editor Control — Standalone controller (reusable without catalog).
 *
 * Creates store, builds panel, subscribes store → panel.update().
 * Exposes: render(container), destroy(), getData(), setData().
 */

import { SchedulingEditorStore } from './schedulingEditorStore';
import { buildSchedulingEditorPanel } from './schedulingEditorPanel';
import type { SchedulingPolicyData, SchedulingEditorConfig } from './types';
import type { PolicyEditorInstance as CatalogEditorInstance } from '../../types';

export class SchedulingEditorControl {
  private readonly store: SchedulingEditorStore;
  private readonly panel: { element: HTMLElement; update: (state: any) => void };
  private readonly unsubscribe: () => void;
  private container: HTMLElement | null = null;

  constructor(config: SchedulingEditorConfig) {
    this.store = new SchedulingEditorStore(config);
    this.panel = buildSchedulingEditorPanel(this.store, config);

    this.unsubscribe = this.store.subscribe((state) => {
      this.panel.update(state);
    });

    // Initial render
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

  getData(): SchedulingPolicyData {
    return this.store.getData();
  }

  setData(data: SchedulingPolicyData): void {
    this.store.setData(data);
  }

  getStore(): SchedulingEditorStore {
    return this.store;
  }

  /**
   * Create as a PolicyEditorInstance for embedding in the catalog editor shell.
   */
  static createEditorInstance(config: {
    initialData: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
  }): CatalogEditorInstance {
    const editorConfig: SchedulingEditorConfig = {
      initialPolicy: config.initialData as unknown as SchedulingPolicyData,
      onChange: (policy) => config.onChange(policy as unknown as Record<string, unknown>),
    };

    const control = new SchedulingEditorControl(editorConfig);

    return {
      element: control.panel.element,
      setData(data: Record<string, unknown>) {
        control.setData(data as unknown as SchedulingPolicyData);
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

/**
 * Convenience factory for standalone use (e.g., TMX scheduling page).
 */
export function createSchedulingEditor(
  config: SchedulingEditorConfig,
  container: HTMLElement,
): SchedulingEditorControl {
  const control = new SchedulingEditorControl(config);
  control.render(container);
  return control;
}
