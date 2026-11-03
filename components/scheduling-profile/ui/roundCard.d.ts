import { RoundProfile, RoundLocator, Severity } from '../types';
export interface RoundCardData {
    round: RoundProfile;
    locator: RoundLocator;
    isSelected: boolean;
    severity: Severity | null;
}
export interface RoundCardCallbacks {
    onClick: (locator: RoundLocator) => void;
    onContextMenu?: (locator: RoundLocator, target: HTMLElement) => void;
}
export declare function buildRoundCard(data: RoundCardData, callbacks: RoundCardCallbacks): HTMLElement;
