/**
 * A TEAM dual's collection as a card: its header (name, type, count) and a grid of its lines, each with its
 * order-of-finish badge. The scorecard renders each collection through it, and a caller can render one alone.
 *
 * With `finishingOrder.editing`, the card is in its order-of-finish entry mode: each line played to a result gets a
 * number field driven by the finishing-order state engine, so a value entered moves the line and the others reshuffle
 * at once, and the order is always saveable. Save hands back the whole order (for `setOrderOfFinish`); Cancel restores it.
 */
import { createFinishingOrderState, type FinishingOrderEntry } from './finishingOrderState';
import { completedMatchUpStatuses } from 'tods-competition-factory';
import { renderMatchUp } from '../renderStructure/renderMatchUp';
import { swapMatchUpSides } from './scorecardSides';

export interface ScorecardLabels {
  /** names the order-of-finish badge for assistive technology and its tooltip, e.g. "Order of finish" */
  orderOfFinish?: string;
  /** the entry mode's buttons */
  save?: string;
  cancel?: string;
}

export interface FinishingOrderEntryOptions {
  editing?: boolean;
  /** the whole order, every line played to a result numbered 1..n, as `setOrderOfFinish` takes it */
  onSave?: (finishingOrder: FinishingOrderEntry[]) => void;
  onCancel?: () => void;
}

export interface CollectionCardOptions {
  collectionDefinition: any;
  collectionMatchUps: any[];
  composition?: any;
  eventHandlers?: any;
  swapSides?: boolean;
  labels?: ScorecardLabels;
  finishingOrder?: FinishingOrderEntryOptions;
}

const INPUT_CLASS = 'chc-scorecard-finish-input';

export function renderCollectionCard({
  collectionDefinition,
  collectionMatchUps,
  composition,
  eventHandlers,
  swapSides,
  labels,
  finishingOrder
}: CollectionCardOptions): HTMLDivElement {
  const panel = document.createElement('div');
  panel.className = 'chc-scorecard-panel';
  panel.appendChild(renderHeader(collectionDefinition, collectionMatchUps.length));

  const editing = !!finishingOrder?.editing;
  const state = editing ? createFinishingOrderState(collectionMatchUps) : undefined;

  const grid = document.createElement('div');
  grid.className = 'chc-scorecard-grid';
  for (const tieMatchUp of collectionMatchUps) {
    const rendered = swapSides ? swapMatchUpSides(tieMatchUp) : tieMatchUp;
    const card = renderMatchUp({ matchUp: rendered, isLucky: true, eventHandlers, composition });
    card.classList.add('chc-scorecard-card');
    const marker = state ? renderFinishInput(tieMatchUp, state, labels) : renderOrderOfFinishBadge(tieMatchUp, labels);
    if (marker) card.appendChild(marker);
    grid.appendChild(card);
  }
  panel.appendChild(grid);

  if (state) panel.appendChild(renderEntryFooter({ panel, state, labels, finishingOrder }));
  return panel;
}

function renderHeader(collectionDefinition: any, count: number): HTMLDivElement {
  const header = document.createElement('div');
  header.className = 'chc-scorecard-panel-header';

  const nameEl = document.createElement('div');
  nameEl.className = 'chc-scorecard-panel-name';
  nameEl.textContent = collectionDefinition.collectionName || 'Collection';

  const meta = document.createElement('div');
  meta.className = 'chc-scorecard-panel-meta';

  const mType = (collectionDefinition.matchUpType || '').toUpperCase();
  const typeBadge = document.createElement('span');
  typeBadge.className = `chc-scorecard-type-badge chc-scorecard-type-badge--${
    mType === 'DOUBLES' ? 'doubles' : 'singles'
  }`;
  typeBadge.textContent = mType === 'DOUBLES' ? 'D' : 'S';

  const countBadge = document.createElement('span');
  countBadge.className = 'chc-scorecard-count-badge';
  countBadge.textContent = String(count);

  meta.appendChild(typeBadge);
  meta.appendChild(countBadge);
  header.appendChild(nameEl);
  header.appendChild(meta);
  return header;
}

/**
 * The order in which a completed line finished among its collection's lines (`matchUp.orderOfFinish`). A line that is
 * no longer complete shows none, since a cleared line can still carry its earlier number on an older record.
 */
function renderOrderOfFinishBadge(tieMatchUp: any, labels?: ScorecardLabels): HTMLSpanElement | undefined {
  const { orderOfFinish, matchUpStatus } = tieMatchUp ?? {};
  if (!orderOfFinish || !completedMatchUpStatuses.includes(matchUpStatus)) return undefined;

  const label = `${labels?.orderOfFinish ?? 'Order of finish'} ${orderOfFinish}`;
  const badge = document.createElement('span');
  badge.className = 'chc-scorecard-finish-badge';
  badge.dataset.orderOfFinish = String(orderOfFinish);
  badge.textContent = String(orderOfFinish);
  badge.title = label;
  badge.setAttribute('aria-label', label);
  return badge;
}

type FinishingOrderState = ReturnType<typeof createFinishingOrderState>;

function renderFinishInput(tieMatchUp: any, state: FinishingOrderState, labels?: ScorecardLabels) {
  const { matchUpId } = tieMatchUp;
  if (!state.isEditable(matchUpId)) return undefined;

  const input = document.createElement('input');
  input.className = INPUT_CLASS;
  input.type = 'number';
  input.min = '1';
  input.max = String(state.order().length);
  input.step = '1';
  input.dataset.matchUpId = matchUpId;
  input.value = String(state.valueOf(matchUpId));
  input.setAttribute('aria-label', labels?.orderOfFinish ?? 'Order of finish');
  // a click in the field is not a click on the line
  input.addEventListener('click', (event) => event.stopPropagation());
  return input;
}

function refreshInputs(panel: HTMLElement, state: FinishingOrderState): void {
  panel.querySelectorAll<HTMLInputElement>(`.${INPUT_CLASS}`).forEach((input) => {
    input.value = String(state.valueOf(input.dataset.matchUpId as string));
  });
}

function renderEntryFooter({
  finishingOrder,
  labels,
  panel,
  state
}: {
  finishingOrder?: FinishingOrderEntryOptions;
  labels?: ScorecardLabels;
  panel: HTMLElement;
  state: FinishingOrderState;
}): HTMLDivElement {
  const footer = document.createElement('div');
  footer.className = 'chc-scorecard-finish-footer';

  const save = document.createElement('button');
  save.className = 'button is-small is-primary';
  save.textContent = labels?.save ?? 'Save';
  save.dataset.action = 'save-finishing-order';

  const cancel = document.createElement('button');
  cancel.className = 'button is-small';
  cancel.textContent = labels?.cancel ?? 'Cancel';
  cancel.dataset.action = 'cancel-finishing-order';

  const update = () => {
    refreshInputs(panel, state);
    save.disabled = !state.isDirty();
  };
  update();

  // each committed value moves its line; the others reshuffle, so the fields never show a duplicate or a gap
  panel.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    if (!input.classList?.contains(INPUT_CLASS)) return;
    state.setValue(input.dataset.matchUpId as string, Number(input.value));
    update();
  });
  save.addEventListener('click', () => finishingOrder?.onSave?.(state.toFinishingOrder()));
  cancel.addEventListener('click', () => {
    state.reset();
    update();
    finishingOrder?.onCancel?.();
  });

  footer.appendChild(cancel);
  footer.appendChild(save);
  return footer;
}
