/**
 * Seeding Editor Control — Standalone controller (reusable without catalog).
 *
 * Mirrors SchedulingEditorControl.
 */

import { SeedingEditorStore } from './seedingEditorStore';
import { buildSeedingEditorPanel } from './seedingEditorPanel';
import type { SeedingPolicyData, SeedingEditorConfig } from './types';
import type { PolicyEditorInstance as CatalogEditorInstance } from '../../types';

export class SeedingEditorControl {
  private readonly store: SeedingEditorStore;
  private readonly panel: { element: HTMLElement; update: (state: any) => void };
  private readonly unsubscribe: () => void;
  private container: HTMLElement | null = null;

  constructor(config: SeedingEditorConfig) {
    this.store = new SeedingEditorStore(config);
    this.panel = buildSeedingEditorPanel(this.store, config);

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

  getData(): SeedingPolicyData {
    return this.store.getData();
  }

  setData(data: SeedingPolicyData): void {
    this.store.setData(data);
  }

  getStore(): SeedingEditorStore {
    return this.store;
  }

  static createEditorInstance(config: {
    initialData: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
  }): CatalogEditorInstance {
    const editorConfig: SeedingEditorConfig = {
      initialPolicy: config.initialData as unknown as SeedingPolicyData,
      onChange: (policy) => config.onChange(policy as unknown as Record<string, unknown>)
    };

    const control = new SeedingEditorControl(editorConfig);

    return {
      element: control.panel.element,
      setData(data: Record<string, unknown>) {
        control.setData(data as unknown as SeedingPolicyData);
      },
      getData() {
        return control.getData() as unknown as Record<string, unknown>;
      },
      destroy() {
        control.destroy();
      }
    };
  }
}

export function createSeedingEditor(
  config: SeedingEditorConfig,
  container: HTMLElement
): SeedingEditorControl {
  const control = new SeedingEditorControl(config);
  control.render(container);
  return control;
}
