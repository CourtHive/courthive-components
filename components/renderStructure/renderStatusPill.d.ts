/** The pill's text: a fixed abbreviation, else the status's first three letters with underscores dropped. */
export declare function statusPillText(matchUpStatus?: string): string;
export declare function renderStatusPill({ matchUpStatus }: {
    matchUpStatus?: string;
}): HTMLElement;
