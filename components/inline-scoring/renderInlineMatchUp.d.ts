import { Composition, EventHandlers, MatchUp } from '../../types';
import { InlineScoringManager } from './inlineScoringManager';
interface RenderInlineMatchUpParams {
    matchUp: MatchUp;
    composition: Composition;
    manager: InlineScoringManager;
    matchUpFormat?: string;
    eventHandlers?: EventHandlers;
    isLucky?: boolean;
    isAdHoc?: boolean;
    className?: string;
    moiety?: boolean;
    initialRoundNumber?: number;
    isFinalRound?: boolean;
    searchActive?: boolean;
    selectedMatchUpId?: string;
}
/**
 * Renders a matchUp with inline scoring interactivity.
 * Sets up event handlers and configuration state, then delegates to `renderMatchUp`.
 * The footer buttons (Undo/Redo/Clear/Submit) are rendered by `renderMatchUp` itself,
 * driven by the inlineScoring config state and eventHandlers passed down.
 *
 * Returns a container element that re-renders itself after each scoring action, or **`null`** when the
 * matchUp must not be offered for scoring — see `isScorable`. Callers must handle the null rather than
 * replacing a rendered cell with it; the return type is what forces them to.
 */
export declare function renderInlineMatchUp(params: RenderInlineMatchUpParams): HTMLElement | null;
export {};
