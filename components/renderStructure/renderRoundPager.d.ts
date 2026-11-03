/**
 * A pager for a structure rendered with `carousel`: one button per round that scrolls the carousel to it,
 * with `aria-current` on the round in view. Mount it next to the structure; call `destroy` when the structure
 * is removed or re-rendered, which disconnects the observer that tracks the round in view.
 *
 * Labels come from each round's header when it has one (`configuration.roundHeader`), else `R1`, `R2`, ...
 */
export declare function renderRoundPager({ behavior, structure }: {
    behavior?: 'smooth' | 'instant' | 'auto';
    structure: HTMLElement;
}): {
    element: HTMLElement;
    destroy: () => void;
};
