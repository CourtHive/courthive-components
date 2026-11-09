import { DisplaySettingsConfig, DisplaySettingsLabels, DisplaySettingsMode } from './displaySettingsTypes';
export declare const displaySettingsLabels: DisplaySettingsLabels;
/** A single composition store backs the quick settings, advanced editor and preview. */
export declare function createDisplaySettings(container: HTMLElement, config: DisplaySettingsConfig): {
    element: HTMLDivElement;
    getComposition: () => import('../..').SavedComposition;
    getMode: () => DisplaySettingsMode;
    setMode: (next: DisplaySettingsMode) => void;
    destroy: () => void;
};
