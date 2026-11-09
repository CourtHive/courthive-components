import { DisplaySettingsDialogConfig } from './displaySettingsTypes';
/** Reusable display-settings modal; the host persists its complete snapshot on Save. */
export declare function openDisplaySettingsDialog(config: DisplaySettingsDialogConfig): {
    close: () => void;
    element: HTMLDivElement;
    getComposition: () => import('../..').SavedComposition;
    getMode: () => import('./displaySettingsTypes').DisplaySettingsMode;
    setMode: (next: import('./displaySettingsTypes').DisplaySettingsMode) => void;
    destroy: () => void;
};
