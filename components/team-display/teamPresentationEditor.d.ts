import { TeamPresentation, TeamColors } from '../scorecard/teamPalette';
export interface PresentationTeam {
    participantId: string;
    participantName?: string;
    teamColors?: TeamColors;
}
/** Sparse overrides stay separate from the provider-authored team defaults. */
export declare function renderTeamPresentationEditor(target: HTMLElement, initial: unknown, teams: PresentationTeam[], labels?: Record<string, string>): {
    read: () => TeamPresentation | undefined;
};
