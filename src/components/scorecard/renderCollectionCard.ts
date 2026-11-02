/**
 * A TEAM dual's collection as a card: its header (name, type, count) and a grid of its lines, each with its
 * order-of-finish badge. The scorecard renders each collection through it, and a caller can render one alone.
 *
 * With `finishingOrder.editing`, the card is in its order-of-finish entry mode: each line played to a result gets a
 * number field driven by the finishing-order state engine, so a value entered moves the line and the others reshuffle
 * at once, and the order is always saveable. Save hands back the whole order (for `setOrderOfFinish`); Cancel restores it.
 *
 * With `issues` (the factory's `getDualIssues`), a line with an issue is marked, its messages in the marker's tooltip
 * and aria label, and the header counts the collection's lines with one.
 */
import { createFinishingOrderState, type FinishingOrderEntry } from './finishingOrderState';
import { issueMessage, lineIssues, type ScorecardIssue } from './dualIssues';
import { completedMatchUpStatuses } from 'tods-competition-factory';
import { renderMatchUp } from '../renderStructure/renderMatchUp';
import { FLAG_ICON, icon, WARNING_ICON } from './scorecardIcons';
import { swapMatchUpSides } from './scorecardSides';

export interface ScorecardLabels {
  /** names the order-of-finish badge for assistive technology and its tooltip, e.g. "Order of finish" */
  orderOfFinish?: string;
  /** the entry mode's buttons */
  save?: string;
  cancel?: string;
  /** a message per issue code, in place of the English defaults */
  issues?: Record<string, string>;
  /** names the header's count of lines with an issue, e.g. "Lines with issues" */
  issueCount?: string;
  /** the order-of-finish entry mode's instruction, shown beside Save / Cancel */
  finishingOrderHint?: string;
  /** the header's team-score override: its buttons, the tag shown while the score is set by hand, the winner choice */
  override?: string;
  restore?: string;
  manual?: string;
  winner?: string;
  /** the home team: its tag, the tag's tooltip when the home team was inferred, and the set action */
  home?: string;
  homeVenue?: string;
  homeHostOrganisation?: string;
  setHome?: string;
}

export interface FinishingOrderEntryOptions {
  editing?: boolean;
  /**
   * the whole order, every line played to a result numbered 1..n, as `setOrderOfFinish` takes it. The card then takes
   * the order as saved and disables Save until the next edit, unless this returns (or resolves to) `false` or throws:
   * then the edits stay and Save is offered again.
   */
  onSave?: (finishingOrder: FinishingOrderEntry[]) => void | boolean | Promise<void | boolean>;
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
  /** the dual's issues; those naming this collection's lines are marked */
  issues?: ScorecardIssue[];
}

const INPUT_CLASS = 'chc-scorecard-finish-input';
const ARIA_LABEL = 'aria-label';
const ORDER_OF_FINISH = 'Order of finish';

export function renderCollectionCard({
  collectionDefinition,
  collectionMatchUps,
  composition,
  eventHandlers,
  swapSides,
  labels,
  finishingOrder,
  issues
}: CollectionCardOptions): HTMLDivElement {
  const panel = document.createElement('div');
  panel.className = 'chc-scorecard-panel';
  const byLine = lineIssues(
    issues,
    collectionMatchUps.map(({ matchUpId }) => matchUpId)
  );
  const header = renderHeader(collectionDefinition, collectionMatchUps.length);
  if (byLine.size) header.querySelector('.chc-scorecard-panel-meta')?.prepend(renderIssueCount(byLine.size, labels));
  panel.appendChild(header);

  const editing = !!finishingOrder?.editing;
  const state = editing ? createFinishingOrderState(collectionMatchUps) : undefined;

  const grid = document.createElement('div');
  grid.className = 'chc-scorecard-grid';
  for (const tieMatchUp of collectionMatchUps) {
    const rendered = swapSides ? swapMatchUpSides(tieMatchUp) : tieMatchUp;
    const card = renderMatchUp({ matchUp: rendered, isLucky: true, eventHandlers, composition });
    card.classList.add('chc-scorecard-card');
    const cardIssues = byLine.get(tieMatchUp.matchUpId);
    if (cardIssues) markIssues(card, cardIssues);
    card.prepend(renderLineBar({ tieMatchUp, collectionDefinition, state, labels, issues: cardIssues }));
    grid.appendChild(card);
  }
  panel.appendChild(grid);

  if (state) panel.classList.add('chc-scorecard-panel--editing');
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

type FinishingOrderState = ReturnType<typeof createFinishingOrderState>;

/**
 * The strip above each line's matchUp: the line's name as a scorecard calls it (S1, D2), then its issues and its order
 * of finish (a number field in entry mode). It sits in the card's flow, so nothing it shows can cover the matchUp.
 */
function renderLineBar({
  tieMatchUp,
  collectionDefinition,
  state,
  labels,
  issues
}: {
  tieMatchUp: any;
  collectionDefinition: any;
  state?: FinishingOrderState;
  labels?: ScorecardLabels;
  issues?: ScorecardIssue[];
}): HTMLDivElement {
  const bar = document.createElement('div');
  bar.className = 'chc-scorecard-line-bar';

  const name = document.createElement('span');
  name.className = 'chc-scorecard-line-name';
  const type = (tieMatchUp.matchUpType ?? collectionDefinition.matchUpType ?? '').toUpperCase();
  name.textContent = `${type === 'DOUBLES' ? 'D' : 'S'}${tieMatchUp.collectionPosition ?? ''}`;
  bar.appendChild(name);

  if (issues) bar.appendChild(renderIssueMarker(issues, labels));
  const finish = state ? renderFinishStepper(tieMatchUp, state, labels) : renderOrderOfFinishBadge(tieMatchUp, labels);
  if (finish) bar.appendChild(finish);
  return bar;
}

/**
 * The order in which a completed line finished among its collection's lines (`matchUp.orderOfFinish`). A line that is
 * no longer complete shows none, since a cleared line can still carry its earlier number on an older record.
 */
function renderOrderOfFinishBadge(tieMatchUp: any, labels?: ScorecardLabels): HTMLSpanElement | undefined {
  const { orderOfFinish, matchUpStatus } = tieMatchUp ?? {};
  if (!orderOfFinish || !completedMatchUpStatuses.includes(matchUpStatus)) return undefined;

  const label = `${labels?.orderOfFinish ?? ORDER_OF_FINISH} ${orderOfFinish}`;
  const badge = document.createElement('span');
  badge.className = 'chc-scorecard-finish-badge';
  badge.dataset.orderOfFinish = String(orderOfFinish);
  badge.title = label;
  badge.setAttribute(ARIA_LABEL, label);
  const value = document.createElement('span');
  value.textContent = String(orderOfFinish);
  badge.append(icon(FLAG_ICON), value);
  return badge;
}

function renderIssueCount(count: number, labels?: ScorecardLabels): HTMLSpanElement {
  const label = `${labels?.issueCount ?? 'Lines with issues'}: ${count}`;
  const badge = document.createElement('span');
  badge.className = 'chc-scorecard-issue-count';
  badge.title = label;
  badge.setAttribute(ARIA_LABEL, label);
  const value = document.createElement('span');
  value.textContent = String(count);
  badge.append(icon(WARNING_ICON), value);
  return badge;
}

function markIssues(card: HTMLElement, issues: ScorecardIssue[]): void {
  card.classList.add('chc-scorecard-card--issue');
  card.dataset.issueCodes = [...new Set(issues.map(({ code }) => code))].join(' ');
}

/** a line's issues, the first named in full and the rest counted; all of them in the tooltip and aria label */
function renderIssueMarker(issues: ScorecardIssue[], labels?: ScorecardLabels): HTMLSpanElement {
  const messages = [...new Set(issues.map((issue) => issueMessage(issue, labels?.issues)))];
  const marker = document.createElement('span');
  marker.className = 'chc-scorecard-issue-marker';
  marker.title = messages.join('\n');
  marker.setAttribute('role', 'img');
  marker.setAttribute(ARIA_LABEL, messages.join('; '));

  const text = document.createElement('span');
  text.className = 'chc-scorecard-issue-text';
  text.textContent = messages[0];
  marker.append(icon(WARNING_ICON), text);
  if (messages.length > 1) {
    const more = document.createElement('span');
    more.className = 'chc-scorecard-issue-more';
    more.textContent = `+${messages.length - 1}`;
    marker.appendChild(more);
  }
  return marker;
}

/** entry mode: the line's number between an earlier and a later step; a line not played to a result has none */
function renderFinishStepper(tieMatchUp: any, state: FinishingOrderState, labels?: ScorecardLabels) {
  const { matchUpId } = tieMatchUp;
  if (!state.isEditable(matchUpId)) return undefined;

  const stepper = document.createElement('span');
  stepper.className = 'chc-scorecard-finish-stepper';
  // a click in the stepper is not a click on the line
  stepper.addEventListener('click', (event) => event.stopPropagation());

  const input = document.createElement('input');
  input.className = INPUT_CLASS;
  input.type = 'number';
  input.inputMode = 'numeric';
  input.min = '1';
  input.max = String(state.order().length);
  input.step = '1';
  input.dataset.matchUpId = matchUpId;
  input.value = String(state.valueOf(matchUpId));
  input.setAttribute(ARIA_LABEL, labels?.orderOfFinish ?? ORDER_OF_FINISH);
  input.addEventListener('focus', () => input.select());

  // a step commits like a typed value, through the panel's one change listener
  const step = (delta: number, text: string, action: string) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chc-scorecard-finish-step';
    button.textContent = text;
    button.dataset.action = action;
    button.tabIndex = -1;
    button.setAttribute(ARIA_LABEL, `${labels?.orderOfFinish ?? ORDER_OF_FINISH} ${text}`);
    button.addEventListener('click', () => {
      input.value = String((state.valueOf(matchUpId) ?? 0) + delta);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    return button;
  };

  stepper.append(icon(FLAG_ICON), step(-1, '\u2212', 'finish-earlier'), input, step(1, '+', 'finish-later'));
  return stepper;
}

function refreshInputs(panel: HTMLElement, state: FinishingOrderState): void {
  const last = state.order().length;
  panel.querySelectorAll<HTMLInputElement>(`.${INPUT_CLASS}`).forEach((input) => {
    const value = state.valueOf(input.dataset.matchUpId as string) ?? 0;
    input.value = String(value);
    const stepper = input.parentElement as HTMLElement;
    const earlier = stepper.querySelector<HTMLButtonElement>('[data-action="finish-earlier"]');
    const later = stepper.querySelector<HTMLButtonElement>('[data-action="finish-later"]');
    if (earlier) earlier.disabled = value <= 1;
    if (later) later.disabled = value >= last;
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

  const hint = document.createElement('span');
  hint.className = 'chc-scorecard-finish-hint';
  hint.textContent =
    labels?.finishingOrderHint ?? 'Number the lines in the order they finished; the others move to make room.';

  const save = document.createElement('button');
  save.className = 'button font-medium is-info';
  save.textContent = labels?.save ?? 'Save';
  save.dataset.action = 'save-finishing-order';

  const cancel = document.createElement('button');
  cancel.className = 'button font-medium';
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
  save.addEventListener('click', async () => {
    // no second save while the first is in flight
    save.disabled = true;
    try {
      const saved = await finishingOrder?.onSave?.(state.toFinishingOrder());
      if (saved !== false) state.commit();
    } catch {
      // the caller's save failed: the edits stay, to be saved again or cancelled
    }
    update();
  });
  cancel.addEventListener('click', () => {
    state.reset();
    update();
    finishingOrder?.onCancel?.();
  });

  const actions = document.createElement('div');
  actions.className = 'chc-scorecard-finish-actions';
  actions.append(cancel, save);
  footer.append(hint, actions);
  return footer;
}
