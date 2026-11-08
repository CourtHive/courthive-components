import { RoundProfileProblem } from './roundProfileLogic';
export type RoundProfileEditorLabels = {
    title?: string;
    subtitle?: string;
    reset?: string;
    evenDrawSizeRequired?: string;
    /** Accessible name of a round's input. */
    roundInput?: (roundNumber: number) => string;
    /** The badge between rounds when the next one takes lucky losers. */
    luckyLosers?: (count: number) => string;
    /** The inline message for a profile the factory would refuse. */
    problem?: (problem: RoundProfileProblem) => string;
};
export type RoundProfileEditorOptions = {
    drawSize: number;
    initialProfile?: number[];
    onChange?: (profile: number[] | null) => void;
    labels?: RoundProfileEditorLabels;
    /** Show the profile without letting it be changed (e.g. a draw already generated). */
    readOnly?: boolean;
};
export type RoundProfileEditorController = {
    /** Show or hide the entire editor. */
    setVisible(visible: boolean): void;
    /** Update the drawSize and reset to the ceil-halving default. */
    setDrawSize(drawSize: number): void;
    /** Returns the current profile if valid, otherwise null. */
    getProfile(): number[] | null;
    /** Whether the current state passes all constraints. */
    isValid(): boolean;
    /** Remove the editor from the DOM. */
    destroy(): void;
};
export declare function defaultProblemMessage(problem: RoundProfileProblem): string;
export declare function mountRoundProfileEditor(parentEl: HTMLElement, options: RoundProfileEditorOptions): RoundProfileEditorController;
