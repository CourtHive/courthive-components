/**
 * Schedule page — "related matchUp" highlighting.
 *
 * Hovering a catalog card lights up the matchUps it depends on wherever they
 * appear: court-grid cells, other cards, the active strip. Anything carrying
 * `data-matchup-id` participates, which is every surface on the page, so no
 * registry is needed — the document already knows where each matchUp is drawn.
 *
 * ── Why this is not the conflict highlight ──
 *
 * `scheduleGridCell.ts` already highlights on hover, driven by `issueIds` from
 * `proConflicts`, and paints amber. That relation is *conflict*: two matchUps
 * that cannot both stand. The relation a catalog card carries is different and
 * usually benign — the quarterfinal this semifinal is waiting on, the match a
 * player walked off an hour ago. Painting those amber would teach the operator
 * that a normal draw is full of conflicts, so this is a separate class with a
 * separate colour, and the two can be lit at once without lying about either.
 *
 * The consumer supplies the relation: this component sees one matchUp at a time
 * and could not compute "waiting on" if it wanted to.
 */

export const RELATED_HIGHLIGHT = 'spl-related-highlight';

/**
 * Drop every related highlight in the document.
 *
 * Exported because `mouseleave` is not guaranteed to fire: the catalog rebuilds
 * its cards on every state change, and a card removed while the pointer is over
 * it never fires one — which would strand the highlight until the next hover
 * happened to clear it. Consumers that rebuild cards themselves call this first.
 */
export function clearRelatedHighlight(): void {
  for (const element of document.querySelectorAll(`.${RELATED_HIGHLIGHT}`)) {
    element.classList.remove(RELATED_HIGHLIGHT);
  }
}

/** Light up every element drawn for one of `matchUpIds`. Clears any previous set first. */
export function applyRelatedHighlight(matchUpIds: string[]): void {
  clearRelatedHighlight();
  for (const matchUpId of matchUpIds) {
    for (const element of document.querySelectorAll(`[data-matchup-id="${CSS.escape(matchUpId)}"]`)) {
      element.classList.add(RELATED_HIGHLIGHT);
    }
  }
}

/**
 * Wire hover highlighting onto one card.
 *
 * The relation is resolved on `mouseenter` rather than at build time: it depends
 * on tournament state that moves under a card which may sit unrebuilt for
 * minutes, and resolving it per hover costs one pass instead of one per card in
 * every render.
 *
 * `dragstart` clears as well — a card being dragged is about to be re-parented
 * by the browser, and a highlight left standing behind it reads as a result of
 * the drop rather than a leftover of the hover.
 */
export function attachRelatedHighlight(card: HTMLElement, resolve: () => string[]): void {
  card.addEventListener('mouseenter', () => {
    const related = resolve();
    if (related.length) applyRelatedHighlight([...related, card.dataset.matchupId ?? '']);
  });
  card.addEventListener('mouseleave', clearRelatedHighlight);
  card.addEventListener('dragstart', clearRelatedHighlight);
}
