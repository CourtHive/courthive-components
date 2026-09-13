/**
 * MatchUp Card — Draggable matchUp card for the catalog.
 *
 * Shows "Player A vs Player B" with sides, event/round metadata, and chips.
 */

import { isCompletedStatus } from '../domain/matchUpCatalogProjections';
import { attachRelatedHighlight } from './matchUpHighlight';
import type { CatalogMatchUpItem } from '../types';
import { matchUpLabel } from '../domain/utils';
import {
  splMatchUpCardStyle,
  splCardTitleStyle,
  splCardSidesStyle,
  splCardMetaStyle,
  splCardChipsStyle,
  splCardChipStyle
} from './styles';

/**
 * Grading for the prominent time header. The consumer owns the rule — the card
 * knows only that `ok` is achievable, `warn` is achievable-but-compromised and
 * `alert` is not achievable at all. Omitted leaves the header at its default
 * (green) styling, which is what every consumer got before this option existed.
 */
export type CardTimeStatus = 'ok' | 'warn' | 'alert';

export interface MatchUpCardCallbacks {
  onClick?: (matchUp: CatalogMatchUpItem) => void;
}

export interface MatchUpCardOptions {
  /** When true, render `scheduledTime` as a prominent header in the title row
   *  (top-right) and suppress the standard time chip. Used by the schedule
   *  grid's Scheduled tab where the time is the card's primary signal. */
  prominentTime?: boolean;
  /** Consumer-supplied detail appended below the card's built-in content. Called on
   *  every card render — the catalog rebuilds its cards from scratch on each state
   *  change — so return a freshly created element rather than a cached one, which
   *  would be re-parented rather than reused. Return null to render nothing. */
  renderExtra?: (matchUp: CatalogMatchUpItem) => HTMLElement | null;
  /** Distance from the earliest unscheduled round within this card's event.
   *  0 = this round is the next-to-schedule (highest emphasis on the title),
   *  1 = one round behind, ≥ 2 = further out (lowest emphasis). Mapped to
   *  `spl-card-title--round-current / next / later` classes so consumers can
   *  re-theme via CSS without touching the JS. Omit to leave the title at
   *  its default styling (used for non-catalog renders + scheduled / completed
   *  cards where round priority is meaningless). */
  roundOffset?: number;
  /** Grading for the `prominentTime` header — see `CardTimeStatus`. Ignored when
   *  the header is not rendered. */
  timeStatus?: CardTimeStatus;
  /** Hover text for the time header, explaining what the grading is reading.
   *  A colour that cannot be interrogated is a colour the operator learns to
   *  distrust, so a graded header should always carry one. */
  timeTitle?: string;
  /** MatchUps this card depends on, resolved on hover and highlighted wherever
   *  they are drawn — see `matchUpHighlight.ts`. The consumer owns the relation;
   *  this component sees one matchUp and could not compute "waiting on". Omit to
   *  leave the card without hover highlighting. */
  relatedMatchUpIds?: (item: CatalogMatchUpItem) => string[];
}

export function buildMatchUpCard(
  item: CatalogMatchUpItem,
  callbacks: MatchUpCardCallbacks,
  options: MatchUpCardOptions = {}
): HTMLElement {
  const card = document.createElement('div');
  card.className = splMatchUpCardStyle();
  card.setAttribute('data-matchup-id', item.matchUpId);

  const completed = isCompletedStatus(item.matchUpStatus);

  if (item.isScheduled) {
    card.classList.add('scheduled');
    card.draggable = false;
  } else if (completed) {
    card.classList.add('completed');
    card.draggable = false;
  } else {
    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      e.dataTransfer!.setDragImage(card, card.offsetWidth / 2, 20);
      e.dataTransfer!.setData('application/json', JSON.stringify({ type: 'CATALOG_MATCHUP', matchUp: item }));
      e.dataTransfer!.effectAllowed = 'copyMove';
    });
  }

  if (options.relatedMatchUpIds) {
    attachRelatedHighlight(card, () => options.relatedMatchUpIds!(item));
  }

  if (callbacks.onClick) {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onClick!(item);
    });
  }

  // Title: event — round
  const titleEl = buildTitleRow(item, options);
  card.appendChild(titleEl);

  // Sides: "Player A vs Player B" (or "TBD vs TBD" for unknown)
  const sidesEl = document.createElement('div');
  sidesEl.className = splCardSidesStyle();
  sidesEl.textContent = matchUpLabel(item);
  card.appendChild(sidesEl);

  // Meta
  const metaEl = document.createElement('div');
  metaEl.className = splCardMetaStyle();
  const parts: string[] = [];
  if (item.drawName) parts.push(item.drawName);
  if (item.matchUpType) parts.push(item.matchUpType.toLowerCase());
  metaEl.textContent = parts.join(' \u00b7 ');
  card.appendChild(metaEl);

  // Chips
  const chips = document.createElement('div');
  chips.className = splCardChipsStyle();

  // The prominent header already carries the time; a chip beside it would say
  // the same thing twice.
  if (item.scheduledTime && !options.prominentTime) {
    chips.appendChild(makeChip(item.scheduledTime, 'time'));
  }
  if (item.scheduledCourtName) {
    chips.appendChild(makeChip(item.scheduledCourtName, 'court'));
  }
  if (item.matchUpFormat) {
    chips.appendChild(makeChip(item.matchUpFormat, 'type'));
  }

  // Status chip for completed matchUps
  if (completed && item.matchUpStatus) {
    const statusLabel = item.matchUpStatus.replace(/_/g, ' ');
    chips.appendChild(makeChip(statusLabel, 'status'));
  }

  // STAGE chip — last so it sits bottom-right of the chip row. Only renders
  // for non-MAIN stages (CONSOLATION / PLAYOFF / QUALIFYING / ROUND_ROBIN …);
  // MAIN is the silent default so 80%+ of cards in a standard draw don't
  // accumulate a redundant "MAIN" chip.
  if (item.stage && item.stage !== 'MAIN') {
    const stageLabel = item.stage.replace(/_/g, ' ');
    chips.appendChild(makeChip(stageLabel, 'stage'));
  }

  if (chips.children.length) card.appendChild(chips);

  appendCardExtra(card, item, options);

  // Checkmark for scheduled
  if (item.isScheduled) {
    const check = document.createElement('span');
    check.className = 'spl-matchup-check';
    check.textContent = '\u2713';
    card.appendChild(check);
  }

  return card;
}

/**
 * The card's title row: "event — round", plus the prominent time header when the
 * consumer asked for one.
 *
 * Extracted from `buildMatchUpCard` rather than inlined: the row carries two
 * independent class decisions (round emphasis, time grading) and folding both
 * into the card builder put it over the 30-point cognitive-complexity ceiling.
 */
function buildTitleRow(item: CatalogMatchUpItem, options: MatchUpCardOptions): HTMLElement {
  const titleEl = document.createElement('div');
  titleEl.className = splCardTitleStyle();
  if (typeof options.roundOffset === 'number') {
    // Round-offset class encodes scheduling priority for the operator's eye:
    // current (0) > next (1) > later (>= 2). Only attached when the option is
    // supplied; scheduled / completed cards skip the offset entirely.
    const offsetClass =
      options.roundOffset === 0
        ? 'spl-card-title--round-current'
        : options.roundOffset === 1
          ? 'spl-card-title--round-next'
          : 'spl-card-title--round-later';
    titleEl.classList.add(offsetClass);
  }

  const titleText = `${item.eventName} \u2014 ${item.roundName ?? 'Round ' + item.roundNumber}`;
  if (!(options.prominentTime && item.scheduledTime)) {
    titleEl.textContent = titleText;
    return titleEl;
  }

  titleEl.classList.add('with-time');
  const textEl = document.createElement('span');
  textEl.className = 'spl-card-title-text';
  textEl.textContent = titleText;
  titleEl.appendChild(textEl);
  titleEl.appendChild(buildTimeHeader(item.scheduledTime, options));
  return titleEl;
}

/** The prominent time header, graded by `timeStatus` when the consumer supplied one. */
function buildTimeHeader(scheduledTime: string, options: MatchUpCardOptions): HTMLElement {
  const timeEl = document.createElement('span');
  timeEl.className = 'spl-card-time-header';
  // `ok` is the default paint, so it earns no modifier class — but the data
  // attribute is written for every supplied status so a test (or an operator in
  // devtools) can tell "graded, and fine" from "never graded at all".
  if (options.timeStatus) {
    timeEl.dataset.timeStatus = options.timeStatus;
    if (options.timeStatus !== 'ok') timeEl.classList.add(`spl-card-time-header--${options.timeStatus}`);
  }
  if (options.timeTitle) timeEl.title = options.timeTitle;
  timeEl.textContent = scheduledTime;
  return timeEl;
}

/** Render the consumer's extra detail block, if one was supplied. */
function appendCardExtra(card: HTMLElement, item: CatalogMatchUpItem, options: MatchUpCardOptions): void {
  if (!options.renderExtra) return;
  try {
    const extra = options.renderExtra(item);
    if (!extra) return;
    const holder = document.createElement('div');
    holder.className = 'spl-card-extra';
    holder.appendChild(extra);
    card.appendChild(holder);
  } catch (err) {
    // Fail soft, but never silently: a consumer's badge must not take down the
    // whole catalog, and an operator seeing a missing badge needs the console to
    // say why. Mirrors the inspector panel's renderExtra contract.
    console.error('[schedule-page] card renderExtra threw', err);
  }
}

function makeChip(text: string, kind: string): HTMLElement {
  const c = document.createElement('div');
  c.className = splCardChipStyle() + ' ' + kind;
  c.textContent = text;
  return c;
}
