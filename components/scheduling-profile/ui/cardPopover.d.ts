import { RoundLocator } from '../types';
export interface CardPopoverCallbacks {
    onDelete: (locator: RoundLocator) => void;
    onSetNotBeforeTime: (locator: RoundLocator) => void;
}
export interface CardPopoverManager {
    show(target: HTMLElement, locator: RoundLocator): void;
    destroy(): void;
    isActiveFor(locator: RoundLocator): boolean;
}
export declare function createCardPopoverManager(callbacks: CardPopoverCallbacks): CardPopoverManager;
