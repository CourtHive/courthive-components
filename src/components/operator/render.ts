import { defaultOperatorLabels, operatorMatchText, reconcileOperatorRound, moveOperatorRound } from './model';

// constants and types
import type { OperatorDrawPresentation, OperatorMatchPresentation } from 'tods-competition-factory/operator-types';
import type { OperatorLabels, OperatorRoundState, OperatorViewPhase } from './model';

export type OperatorRenderOptions = {
  onOpenMatch?: (matchUpId: string) => void;
  labels?: OperatorLabels;
  phase?: OperatorViewPhase;
  locale?: string;
};

function node(tag: string, className: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(className: string, text: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = text;
  return element;
}

function viewStatus(phase: OperatorViewPhase, labels: OperatorLabels) {
  const status = node('p', 'chc-operator-status', labels.phases[phase]);
  status.dataset.phase = phase;
  status.setAttribute('role', 'status');
  return status;
}

/** No engine calls, eligibility checks, fetch, navigation or global composition state. */
export function renderOperatorMatch(
  match: OperatorMatchPresentation,
  options: OperatorRenderOptions = {}
): HTMLElement {
  const labels = options.labels ?? defaultOperatorLabels;
  const view = operatorMatchText(match, labels, options.locale);
  const card = node('article', 'chc-operator-match');
  card.dataset.matchUpId = match.matchUpId;
  const heading = node('div', 'chc-operator-match-header');
  heading.append(node('span', '', view.statusText));
  if (view.upsetLabel) heading.append(node('span', 'chc-operator-upset', view.upsetLabel));
  card.append(heading);
  const sides = node('ul', 'chc-operator-sides');
  for (const side of view.sides) {
    const row = node('li', 'chc-operator-side');
    row.dataset.winner = String(side.isWinner);
    const name = node('span', 'chc-operator-name', side.displayName);
    if (side.winnerLabel) name.append(node('span', 'chc-operator-sr-only', ' · ' + side.winnerLabel));
    row.append(name);
    if (side.qualifierLabel) row.append(node('span', 'chc-operator-qualifier', side.qualifierLabel));
    if (side.seedLabel) row.append(node('span', 'chc-operator-seed', side.seedLabel));
    sides.append(row);
  }
  card.append(sides);
  if (view.scoreLine) card.append(node('p', 'chc-operator-score', view.scoreLine));
  if (view.scheduleText) card.append(node('p', 'chc-operator-schedule', view.scheduleText));
  if (options.onOpenMatch) {
    const open = button('chc-operator-open', labels.openMatch);
    open.setAttribute('aria-label', view.accessibleName);
    open.addEventListener('click', () => options.onOpenMatch?.(match.matchUpId));
    card.append(open);
  }
  return card;
}

export function renderOperatorMatchList(
  matches: readonly OperatorMatchPresentation[],
  options: OperatorRenderOptions = {}
): HTMLElement {
  const labels = options.labels ?? defaultOperatorLabels;
  const list = node('section', 'chc-operator-list');
  list.append(viewStatus(options.phase ?? 'read-only', labels));
  if (!matches.length) list.append(node('p', 'chc-operator-empty', labels.noMatches));
  for (const match of matches) list.append(renderOperatorMatch(match, options));
  return list;
}

export type OperatorDrawHandle = {
  element: HTMLElement;
  update(document: OperatorDrawPresentation, phase?: OperatorViewPhase): void;
  destroy(): void;
};

/** The host replaces a whole presentation. Round selection survives by identity, never by stale array index. */
export function createOperatorDraw(
  initial: OperatorDrawPresentation,
  options: OperatorRenderOptions = {}
): OperatorDrawHandle {
  const labels = options.labels ?? defaultOperatorLabels;
  const element = node('section', 'chc-operator-draw');
  let current = initial;
  let phase = options.phase ?? 'read-only';
  let state: OperatorRoundState = reconcileOperatorRound({}, current);
  let destroyed = false;
  function render() {
    if (destroyed) return;
    element.replaceChildren();
    state = reconcileOperatorRound(state, current);
    const index = current.rounds.findIndex((round) => round.roundNumber === state.roundNumber);
    const round = current.rounds[index];
    const navigation = node('nav', 'chc-operator-round-nav');
    navigation.setAttribute('aria-label', labels.round);
    for (const direction of [-1, 1] as const) {
      const control = button('', direction === -1 ? labels.previousRound : labels.nextRound);
      control.disabled = !current.rounds[index + direction];
      control.addEventListener('click', () => {
        state = moveOperatorRound(state, direction, current);
        render();
        // Restore focus to the equivalent navigation control after replacing the DOM.
        const buttons = element.querySelectorAll<HTMLButtonElement>('nav button');
        const preferred = buttons[direction === -1 ? 0 : 1];
        (preferred?.disabled ? [...buttons].find((button) => !button.disabled) : preferred)?.focus();
      });
      navigation.append(control);
    }
    const title = node(
      'h2',
      'chc-operator-round-title',
      round?.name ?? (round ? `${labels.round} ${round.roundNumber}` : labels.noMatches)
    );
    element.append(navigation, title, renderOperatorMatchList(round?.matches ?? [], { ...options, phase }));
  }
  render();
  return {
    element,
    update(document, nextPhase = phase) {
      if (destroyed) return;
      current = document;
      phase = nextPhase;
      render();
    },
    destroy() {
      destroyed = true;
      element.replaceChildren();
    }
  };
}
