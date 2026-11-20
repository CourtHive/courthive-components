/** Schedule catalog adapter. Drag, highlight and consumer extras stay outside the shared display core. */
import { buildSharedMatchUpCard } from '../../match-up-card/matchUpCard';
import { isCompletedStatus } from '../domain/matchUpCatalogProjections';
import { matchUpStatusLabel } from '../../match-up-card/labels';
import { attachRelatedHighlight } from './matchUpHighlight';
import { matchUpLabel } from '../domain/utils';

// constants and types
import type { CardTimeStatus } from '../../match-up-card/matchUpCard';
import type { CatalogMatchUpItem } from '../types';
export type { CardTimeStatus } from '../../match-up-card/matchUpCard';
export interface MatchUpCardCallbacks {
  onClick?: (matchUp: CatalogMatchUpItem) => void;
}
export interface MatchUpCardOptions {
  prominentTime?: boolean;
  renderExtra?: (matchUp: CatalogMatchUpItem) => HTMLElement | null;
  roundOffset?: number;
  timeStatus?: CardTimeStatus;
  timeTitle?: string;
  relatedMatchUpIds?: (item: CatalogMatchUpItem) => string[];
  statusLabels?: Readonly<Record<string, string>>;
  unknownStatusLabel?: string;
}
export function buildMatchUpCard(
  item: CatalogMatchUpItem,
  callbacks: MatchUpCardCallbacks,
  options: MatchUpCardOptions = {}
): HTMLElement {
  const completed = isCompletedStatus(item.matchUpStatus);
  const chips: { text: string; kind: string }[] = [];
  if (item.scheduledTime && !options.prominentTime) chips.push({ text: item.scheduledTime, kind: 'time' });
  if (item.scheduledCourtName) chips.push({ text: item.scheduledCourtName, kind: 'court' });
  if (item.matchUpFormat) chips.push({ text: item.matchUpFormat, kind: 'type' });
  if (completed && item.matchUpStatus)
    chips.push({
      text: matchUpStatusLabel(item.matchUpStatus, options.statusLabels, options.unknownStatusLabel),
      kind: 'status'
    });
  if (item.stage && item.stage !== 'MAIN') chips.push({ text: item.stage.replaceAll('_', ' '), kind: 'stage' });
  const title = `${item.eventName} — ${item.roundName ?? 'Round ' + item.roundNumber}`;
  const names = matchUpLabel(item);
  const card = buildSharedMatchUpCard(
    {
      id: item.matchUpId,
      title,
      names,
      meta: [item.drawName, item.matchUpType?.toLowerCase()].filter(Boolean).join(' · '),
      chips,
      time: options.prominentTime ? item.scheduledTime : undefined,
      timeStatus: options.timeStatus,
      timeTitle: options.timeTitle,
      roundOffset: options.roundOffset
    },
    // `inner`: the card stays a draggable container (TMX's drag source is unchanged) and a button inside it
    // carries activation, so consumer extras sit beside that button rather than inside it.
    { onActivate: callbacks.onClick ? () => callbacks.onClick!(item) : undefined, activator: 'inner' }
  );
  if (callbacks.onClick) {
    // Pointer users could click anywhere on the catalog card before it gained a button; keep that, except
    // where the click lands on an interactive control a consumer put in its extra.
    card.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      if (target?.closest('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])') !== null) return;
      callbacks.onClick!(item);
    });
  }
  if (item.isScheduled) card.classList.add('scheduled');
  else if (completed) card.classList.add('completed');
  card.draggable = !item.isScheduled && !completed;
  if (card.draggable)
    card.addEventListener('dragstart', (event) => {
      event.stopPropagation();
      event.dataTransfer!.setDragImage(card, card.offsetWidth / 2, 20);
      event.dataTransfer!.setData('application/json', JSON.stringify({ type: 'CATALOG_MATCHUP', matchUp: item }));
      event.dataTransfer!.effectAllowed = 'copyMove';
    });
  if (options.relatedMatchUpIds) attachRelatedHighlight(card, () => options.relatedMatchUpIds!(item));
  appendCardExtra(card, item, options);
  if (item.isScheduled) {
    const check = document.createElement('span');
    check.className = 'spl-matchup-check';
    check.textContent = '✓';
    card.append(check);
  }
  return card;
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
