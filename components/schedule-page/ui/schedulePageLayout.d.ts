import { SchedulePageConfig, CatalogPlacement, InspectorPlacement, SchedulePageState, UIPanel } from '../types';
export interface SchedulePageLayoutPanels {
    dateStrip: UIPanel<SchedulePageState>;
    issuesPanel: UIPanel<SchedulePageState>;
    courtGridSlot: UIPanel<SchedulePageState>;
    matchUpCatalog: UIPanel<SchedulePageState>;
    inspectorPanel: UIPanel<SchedulePageState>;
}
export interface SchedulePageLayoutCallbacks {
    onToggleLeft: () => void;
    onInspectorClose?: () => void;
}
export declare function buildSchedulePageLayout(panels: SchedulePageLayoutPanels, callbacks: SchedulePageLayoutCallbacks, options?: Pick<SchedulePageConfig, 'hideLeft' | 'catalogSide' | 'catalogPlacement' | 'inspectorPlacement' | 'inspectorGeometry' | 'onInspectorGeometryChange' | 'onInspectorPlacementChange'>): {
    element: HTMLElement;
    update: (state: SchedulePageState) => void;
    setCatalogPlacement: (placement: CatalogPlacement) => void;
    setCatalogVisible: (visible: boolean) => void;
    setInspectorPlacement: (placement: InspectorPlacement) => void;
    catalogRegion: HTMLElement;
    destroy: () => void;
};
