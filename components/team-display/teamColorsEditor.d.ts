import { TeamColors } from '../scorecard/teamPalette';
/** Own the full CODES palette; changing display selections never drops unselected entries. */
export declare function renderTeamColorsEditor(target: HTMLElement, initial: unknown, labels?: Record<string, string>): {
    read: () => TeamColors | Record<string, never> | undefined;
};
