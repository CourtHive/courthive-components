/**
 * Ranking Points Editor Control — Standalone controller (reusable without catalog).
 *
 * Creates store, builds panel, subscribes store → panel.update().
 * Exposes: render(container), destroy(), getData(), setData().
 */
import { RankingPointsEditorStore } from './rankingPointsEditorStore';
import { buildRankingPointsEditorPanel } from './rankingPointsEditorPanel';
import type { RankingPolicyData, RankingPointsEditorConfig } from './types';
import type { PolicyEditorInstance as CatalogEditorInstance } from '../../types';

export class RankingPointsEditorControl {
  private readonly store: RankingPointsEditorStore;
  private readonly panel: { element: HTMLElement; update: (state: any) => void };
  private readonly unsubscribe: () => void;
  private container: HTMLElement | null = null;

  constructor(config: RankingPointsEditorConfig) {
    this.store = new RankingPointsEditorStore(config);
    this.panel = buildRankingPointsEditorPanel(this.store, config);

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
      this.panel.element.remove();
    }
    this.container = null;
  }

  getData(): RankingPolicyData {
    return this.store.getData();
  }

  setData(data: RankingPolicyData): void {
    this.store.setData(data);
  }

  getStore(): RankingPointsEditorStore {
    return this.store;
  }

  /**
   * Create as a PolicyEditorInstance for embedding in the catalog editor shell.
   */
  static createEditorInstance(config: {
    initialData: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
    readonly?: boolean;
  }): CatalogEditorInstance {
    const editorConfig: RankingPointsEditorConfig = {
      initialPolicy: config.initialData as unknown as RankingPolicyData,
      onChange: (policy) => config.onChange(policy as unknown as Record<string, unknown>),
      readonly: config.readonly,
    };

    const control = new RankingPointsEditorControl(editorConfig);

    return {
      element: control.panel.element,
      setData(data: Record<string, unknown>) {
        control.setData(data as unknown as RankingPolicyData);
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

/**
 * Convenience factory for standalone use.
 */
export function createRankingPointsEditor(
  config: RankingPointsEditorConfig,
  container: HTMLElement
): RankingPointsEditorControl {
  const control = new RankingPointsEditorControl(config);
  control.render(container);
  return control;
}
