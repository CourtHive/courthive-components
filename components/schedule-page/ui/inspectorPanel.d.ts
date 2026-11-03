import { CatalogMatchUpItem, SchedulePageState, UIPanel } from '../types';
export interface ScheduleInspectorPanelOptions {
    /** Consumer-supplied detail rendered below the built-in fields, for the selected
     *  matchUp only. Must return a freshly created element (or null) — the body is
     *  rebuilt on every render, so a cached node would be re-parented, not reused. */
    renderExtra?: (matchUp: CatalogMatchUpItem, state: SchedulePageState) => HTMLElement | null;
}
export declare function buildScheduleInspectorPanel(options?: ScheduleInspectorPanelOptions): UIPanel<SchedulePageState>;
