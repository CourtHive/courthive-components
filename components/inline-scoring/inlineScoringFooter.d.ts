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
 */
export declare function createInlineScoringFooter(params: FooterParams): {
    element: HTMLElement;
    update: () => void;
};
export {};
