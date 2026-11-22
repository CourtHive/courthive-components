export type CardTimeStatus = 'ok' | 'warn' | 'alert';
export type MatchUpCardSide = Readonly<{
    name: string;
    seed?: string;
    qualifier?: string;
    winner?: string;
    scores?: readonly Readonly<{
        label: string;
        text: string;
    }>[];
}>;
export type SharedMatchUpCardData = Readonly<{
    id: string;
    accessibleName?: string;
    scoreText?: string;
    title?: string;
    names?: string;
    sides?: readonly MatchUpCardSide[];
    meta?: string;
    chips?: readonly Readonly<{
        text: string;
        kind: string;
        tone?: string;
    }>[];
    time?: string;
    timeStatus?: CardTimeStatus;
    timeTitle?: string;
    roundOffset?: number;
}>;
/**
 * Where activation lives. `root`: the card itself is the `<button>` (a self-contained row).
 * `inner`: the card is a container and a `<button>` inside it holds the display content, so a host
 * can append its own content (badges, extras) to the card without putting it inside the button,
 * where it would be invalid, unreachable to assistive technology and unable to take its own clicks.
 */
export type CardActivator = 'root' | 'inner';
/** Shared presentation primitive. No catalog state, drag, highlighting, transport or factory imports. */
export declare function buildSharedMatchUpCard(data: SharedMatchUpCardData, options?: {
    onActivate?: () => void;
    compact?: boolean;
    activator?: CardActivator;
}): HTMLElement;
