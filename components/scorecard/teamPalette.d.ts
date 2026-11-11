export interface TeamPaletteColor {
    colorId: string;
    value: string;
    name?: string;
    group?: string;
}
export type TeamColorRole = 'team.surface' | 'team.text' | 'team.accent' | 'score.surface' | 'score.text';
/** Portable CODES TEAM palette and provider-authored preferred color roles. */
export interface TeamColors {
    palette: TeamPaletteColor[];
    display?: {
        roles: Partial<Record<TeamColorRole, string>>;
    };
}
/** A theme marker explicitly uses the renderer/theme fallback; omission inherits. */
export interface TeamPresentation {
    roles?: Partial<Record<TeamColorRole, string | {
        theme: true;
    }>>;
    teams?: Record<string, {
        roles: Partial<Record<TeamColorRole, string | {
            theme: true;
        }>>;
    }>;
}
export declare const TEAM_COLOR_ROLES: Set<TeamColorRole>;
/** Validate the portable palette independently of any renderer or tournament. */
export declare function normalizeTeamPalette(value: unknown): TeamColors | undefined;
/** Unpainted role values. Foreground contrast is resolved by the consuming renderer. */
export interface TeamDisplayColors {
    roles: Partial<Record<TeamColorRole, string>>;
}
export declare const TEAM_RENDERERS: {
    readonly clean: {
        readonly roles: readonly [];
        readonly pairs: readonly [];
    };
    readonly scorecard: {
        readonly roles: readonly ["team.text", "team.accent"];
        readonly pairs: readonly [];
    };
    readonly arena: {
        readonly roles: readonly TeamColorRole[];
        readonly pairs: readonly [readonly ["team.text", "team.surface"], readonly ["score.text", "score.surface"]];
    };
};
/**
 * Read sparse tournament settings without coupling them to a particular TEAM palette. Invalid entries are
 * dropped individually (an empty team exception inherits) and described in `issues`; writers reject any issue.
 */
export declare function normalizeTeamPresentation(value: unknown, issues?: string[]): TeamPresentation | undefined;
/** Resolve identity defaults and sparse overrides; never invent assignments from palette order. */
export declare function resolveTeamColors(value: unknown, options?: {
    participantId?: string;
    presentation?: TeamPresentation;
    onDiagnostic?: (message: string) => void;
}): TeamDisplayColors | undefined;
export declare function teamContrastRatio(first: string, second: string): number;
/** Choose a readable paint value without changing the stored team preference. */
export declare function readableTeamText(preferred: string | undefined, background: string, fallback: string): string;
/** Renderer-local role painting; callers supply the actual theme surface and foreground. */
export declare function teamRoleStyles(colors: TeamDisplayColors | undefined, theme: {
    background: string;
    text: string;
}, region?: 'team' | 'score'): string;
