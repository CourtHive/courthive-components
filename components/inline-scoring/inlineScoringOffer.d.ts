import { InlineScoringManager } from './inlineScoringManager';
import { MatchUp } from '../../types';
export type InlineScoringMode = 'points' | 'games' | string;
/** The input a mode scores with: by the game in `games` mode, by the point otherwise. */
export declare function inlineInputLevel(mode: InlineScoringMode): 'point' | 'game';
/**
 * Whether a matchUp may be offered for inline scoring in a mode, and the engine made for it when it may.
 *
 * Two refusals, in order:
 *  - `isScorable` fails (no factory matchUpFormat, or a side nobody can name). No engine is created, so an
 *    invented format never reaches `ScoringEngine`.
 *  - the format's set in play takes neither input the mode scores with (a segment of outs takes set totals
 *    only). The engine made to ask is removed again, so a refused matchUp leaves nothing in the manager.
 *
 * Returns the refusal as the message `renderInlineMatchUp` logs, or undefined when the matchUp is offered.
 * DOM-free on purpose, so the rule is a node test rather than a render.
 */
export declare function inlineScoringRefusal({ matchUp, format, mode, manager }: {
    matchUp: MatchUp;
    format?: string;
    mode: InlineScoringMode;
    manager: InlineScoringManager;
}): string | undefined;
