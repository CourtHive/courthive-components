import { TeamScore } from './teamScoreOverrideState';
import { ScorecardLabels } from './renderCollectionCard';
export interface TeamScoreOptions {
    /** the score is set by hand (automatic team scoring is off) */
    manual?: boolean;
    /** offered when given: the header's scores become editable */
    onOverride?: (teamScore: TeamScore) => void;
    /** offered while `manual`: hand the dual back to automatic scoring */
    onRestore?: () => void;
}
export declare function attachTeamScoreEditor({ header, matchUp, swapSides, teamScore, labels }: {
    header: HTMLElement;
    matchUp: any;
    swapSides?: boolean;
    teamScore: TeamScoreOptions;
    labels?: ScorecardLabels;
}): void;
