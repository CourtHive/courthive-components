import { buildSharedMatchUpCard } from '../match-up-card/matchUpCard';
import { createOperatorStatus } from './status';
import {
  defaultOperatorLabels,
  operatorMatchText,
  operatorDateLabel,
  reconcileOperatorRound,
  moveOperatorRound,
  selectOperatorRound
} from './model';

// constants and types
import type { OperatorLabels, OperatorRoundState, OperatorViewState, OperatorDayFrame, OperatorDetails } from './model';
import type { OperatorDrawPresentation, OperatorMatchPresentation } from 'tods-competition-factory/operator-types';

export type OperatorRenderOptions = OperatorViewState & {
  onOpenMatch?: (matchUpId: string) => void;
  labels?: OperatorLabels;
  locale?: string;
  dayFrame?: OperatorDayFrame;
  /** Preformatted display cells from the host/producer; never split a score string in the browser. */
  details?: OperatorDetails;
};
export function operatorNode(tag: string, className: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
export function operatorButton(className: string, text: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = text;
  return element;
}
/** Thin adapter over the same engine-free card used by the scheduling catalog. */
function matchCard(match: OperatorMatchPresentation, options: OperatorRenderOptions, compact: boolean): HTMLElement {
  const labels = options.labels ?? defaultOperatorLabels;
  const view = operatorMatchText(match, labels, options.locale, options.dayFrame);
  const details = options.details?.[match.matchUpId];
  const columns = details?.scoreColumns;
  const chips = [{ text: view.statusText, kind: 'status', tone: view.statusTone }];
  if (match.schedule?.court) chips.push({ text: match.schedule.court, kind: 'court', tone: 'neutral' });
  const card = buildSharedMatchUpCard(
    {
      id: match.matchUpId,
      title: details?.title,
      sides: view.sides.map((side) => ({
        name: side.displayName,
        seed: side.seedLabel,
        qualifier: side.qualifierLabel,
        winner: side.winnerLabel,
        scores: columns?.map((column) => ({
          label: column.label,
          text: side.sideNumber === 1 ? column.side1 : column.side2
        }))
      })),
      scoreText: columns?.length ? undefined : view.scoreLine,
      meta: compact
        ? details?.meta
        : options.dayFrame
          ? [
              operatorDateLabel(options.dayFrame.date, options.dayFrame.locale),
              options.dayFrame.venueLabel,
              options.dayFrame.timeZoneLabel ?? labels.timeZoneUnavailable
            ]
              .filter(Boolean)
              .join(' · ')
          : view.scheduleText,
      chips,
      time: match.schedule?.time,
      accessibleName: [
        view.accessibleName,
        match.schedule?.court ?? labels.otherCourt,
        match.schedule?.time ?? labels.unscheduled,
        view.statusText,
        ...view.sides.filter((side) => side.winnerLabel).map((side) => labels.winner + ': ' + side.displayName),
        ...(columns ?? []).map((column) => column.label + ': ' + column.side1 + '–' + column.side2)
      ].join(' · ')
    },
    { compact, onActivate: options.onOpenMatch ? () => options.onOpenMatch?.(match.matchUpId) : undefined }
  );
  card.classList.add(compact ? 'chc-operator-row' : 'chc-operator-match');
  card.dataset.matchUpId = match.matchUpId;
  if (
    compact &&
    options.dayFrame &&
    (match.schedule?.date !== options.dayFrame.date || match.schedule?.timeZone !== options.dayFrame.timeZone)
  )
    card.append(operatorNode('span', 'chc-operator-row-exception', view.scheduleText));
  return card;
}
export function renderOperatorMatch(
  match: OperatorMatchPresentation,
  options: OperatorRenderOptions = {}
): HTMLElement {
  return matchCard(match, options, false);
}
export function renderOperatorMatchRow(
  match: OperatorMatchPresentation,
  options: OperatorRenderOptions = {}
): HTMLElement {
  return matchCard(match, options, true);
}
export function renderOperatorMatchList(
  matches: readonly OperatorMatchPresentation[],
  options: OperatorRenderOptions = {}
): HTMLElement {
  const labels = options.labels ?? defaultOperatorLabels;
  const list = operatorNode('section', 'chc-operator-list');
  const status = createOperatorStatus(labels, options.dayFrame);
  list.append(status.element);
  status.update(options);
  if (!matches.length) list.append(operatorNode('p', 'chc-operator-empty', labels.noMatches));
  for (const match of matches) list.append(renderOperatorMatchRow(match, options));
  return list;
}
export type OperatorDrawHandle = {
  element: HTMLElement;
  update(document: OperatorDrawPresentation, state?: OperatorViewState): void;
  destroy(): void;
};
export function createOperatorDraw(
  initial: OperatorDrawPresentation,
  options: OperatorRenderOptions = {}
): OperatorDrawHandle {
  const labels = options.labels ?? defaultOperatorLabels;
  const element = operatorNode('section', 'chc-operator-draw');
  const status = createOperatorStatus(labels, options.dayFrame);
  const body = operatorNode('div', 'chc-operator-draw-body');
  element.append(status.element, body);
  let current: OperatorDrawPresentation | undefined = initial;
  let viewState: OperatorViewState = options;
  let state: OperatorRoundState = reconcileOperatorRound({}, initial);
  let destroyed = false;
  function render(focus?: 'select' | -1 | 1) {
    if (destroyed || !current) return undefined;
    const presentation = current;
    state = reconcileOperatorRound(state, presentation);
    const index = presentation.rounds.findIndex((round) => round.roundNumber === state.roundNumber);
    const round = presentation.rounds[index];
    const title = operatorNode(
      'h2',
      'chc-operator-round-title',
      round?.name ?? (round ? `${labels.round} ${round.roundNumber}` : labels.noMatches)
    );
    const navigation = operatorNode('nav', 'chc-operator-round-nav');
    navigation.setAttribute('aria-label', `${labels.round}: ${title.textContent}`);
    for (const direction of [-1, 1] as const) {
      const control = operatorButton('', direction === -1 ? labels.previousRound : labels.nextRound);
      control.dataset.direction = String(direction);
      control.disabled = !presentation.rounds[index + direction];
      control.addEventListener('click', () => {
        if (destroyed || !current) return undefined;
        state = moveOperatorRound(state, direction, current);
        render(direction);
      });
      navigation.append(control);
    }
    const select = document.createElement('select');
    select.setAttribute('aria-label', labels.round);
    for (const item of presentation.rounds) {
      const option = document.createElement('option');
      option.value = String(item.roundNumber);
      option.textContent = item.name ?? `${labels.round} ${item.roundNumber}`;
      option.selected = item.roundNumber === state.roundNumber;
      select.append(option);
    }
    select.disabled = !presentation.rounds.length;
    select.addEventListener('change', () => {
      if (destroyed || !current) return undefined;
      state = selectOperatorRound(Number(select.value), current);
      render('select');
    });
    navigation.insertBefore(select, navigation.lastChild);
    const list = operatorNode('div', 'chc-operator-list');
    if (!round?.matches.length) list.append(operatorNode('p', 'chc-operator-empty', labels.noMatches));
    for (const match of round?.matches ?? [])
      list.append(
        renderOperatorMatchRow(match, {
          ...options,
          onOpenMatch: options.onOpenMatch
            ? (id) => {
                if (!destroyed) options.onOpenMatch?.(id);
              }
            : undefined
        })
      );
    body.replaceChildren(title, navigation, list);
    status.update(viewState);
    if (focus === 'select') select.focus();
    else if (focus !== undefined) {
      const controls = [...navigation.querySelectorAll<HTMLButtonElement>('button')];
      (
        controls.find((control) => control.dataset.direction === String(focus) && !control.disabled) ??
        controls.find((control) => !control.disabled) ??
        select
      ).focus();
    }
  }
  render();
  return {
    element,
    update(document, nextState = {}) {
      if (destroyed) return undefined;
      current = document;
      viewState = { ...viewState, ...nextState };
      render();
    },
    destroy() {
      destroyed = true;
      current = undefined;
      state = {};
      status.destroy();
      element.replaceChildren();
    }
  };
}
