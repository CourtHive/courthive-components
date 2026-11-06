import { ScorecardHomeOptions } from './homeSides';
import { ScorecardLabels } from './renderCollectionCard';
export declare function attachHomeEditor({ header, participantIds, home, labels }: {
    header: HTMLElement;
    /** left then right, after any `swapSides` */
    participantIds: (string | undefined)[];
    home: ScorecardHomeOptions;
    labels?: ScorecardLabels;
}): void;
