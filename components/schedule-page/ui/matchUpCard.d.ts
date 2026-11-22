import { CardTimeStatus } from '../../match-up-card/matchUpCard';
import { CatalogMatchUpItem } from '../types';
export type { CardTimeStatus } from '../../match-up-card/matchUpCard';
export interface MatchUpCardCallbacks {
    onClick?: (matchUp: CatalogMatchUpItem) => void;
}
export interface MatchUpCardOptions {
    prominentTime?: boolean;
    renderExtra?: (matchUp: CatalogMatchUpItem) => HTMLElement | null;
    roundOffset?: number;
    timeStatus?: CardTimeStatus;
    timeTitle?: string;
    relatedMatchUpIds?: (item: CatalogMatchUpItem) => string[];
}
export declare function buildMatchUpCard(item: CatalogMatchUpItem, callbacks: MatchUpCardCallbacks, options?: MatchUpCardOptions): HTMLElement;
