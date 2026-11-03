import { ProfileStoreState, UIPanel } from '../types';
export interface LayoutPanels {
    dateStrip: UIPanel<ProfileStoreState>;
    issuesPanel: UIPanel<ProfileStoreState>;
    venueBoard: UIPanel<ProfileStoreState>;
    roundCatalog: UIPanel<ProfileStoreState>;
}
export declare function buildSchedulingProfileLayout(panels: LayoutPanels, options?: {
    hideLeft?: boolean;
    catalogSide?: 'left' | 'right';
}): {
    element: HTMLElement;
    update: (state: ProfileStoreState) => void;
};
