import { InlineScoringManager } from './inlineScoringManager';
import { MatchUp } from '../../types';
interface FooterParams {
    matchUpId: string;
    manager: InlineScoringManager;
    baseMatchUp: MatchUp;
    onUpdate: (matchUp: MatchUp) => void;
    showSituation?: boolean;
}
/**
 * Creates an interactive footer bar for inline scoring:
 * [Undo] [Redo] [Clear] [Submit]  |  situation flags
 *
 * @deprecated Not what inline scoring renders: use the footer `renderMatchUp` / `renderInlineMatchUp`
 * provide, which shows the same situation flags under `inlineScoring.showSituation`. Kept, working, until
 * the next major removes it.
 */
export declare function createInlineScoringFooter(params: FooterParams): {
    element: HTMLElement;
    update: () => void;
};
export {};
