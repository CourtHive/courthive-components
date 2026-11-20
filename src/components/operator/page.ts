import { defaultOperatorLabels, operatorDateLabel, operatorDayGroups, operatorNowMatch } from './model';
import { operatorNode, operatorButton, renderOperatorMatchRow } from './render';
import { createOperatorStatus } from './status';

// constants and types
import type { OperatorDayFrame, OperatorViewState, OperatorGrouping, OperatorDayFilter } from './model';
import type { OperatorMatchPresentation } from 'tods-competition-factory/operator-types';
import type { OperatorRenderOptions } from './render';

export type OperatorMatchListPage = {
  readonly title: string;
  readonly dayFrame?: OperatorDayFrame;
  readonly matches: readonly OperatorMatchPresentation[];
  readonly complete?: boolean;
};
/** Local facets of already delivered rows. Incomplete results are labelled; this never queries or authorizes. */
export function createOperatorMatchListPage(
  initial: OperatorMatchListPage,
  options: OperatorRenderOptions & { onRefresh?: () => void } = {}
) {
  const labels = options.labels ?? defaultOperatorLabels;
  const element = operatorNode('section', 'chc-operator-page');
  const status = createOperatorStatus(labels);
  const body = operatorNode('div', 'chc-operator-page-body');
  element.append(status.element, body);
  let page: OperatorMatchListPage | undefined = initial;
  let viewState: OperatorViewState = options;
  let filter: OperatorDayFilter = 'all';
  let grouping: OperatorGrouping = 'court';
  let destroyed = false;
  function install(focusKey?: string) {
    if (destroyed || !page) return undefined;
    const current = page;
    const frame = current.dayFrame ?? options.dayFrame;
    const header = operatorNode('header', 'chc-operator-page-header');
    const context = operatorNode('div', '');
    context.append(operatorNode('h1', '', current.title));
    const day = operatorDateLabel(frame?.date, frame?.locale, labels.dateUnavailable, true);
    if (day) context.append(operatorNode('p', '', day));
    context.append(
      operatorNode(
        'p',
        'chc-operator-zone',
        [frame?.venueLabel, frame?.timeZoneLabel ?? labels.timeZoneUnavailable].filter(Boolean).join(' · ')
      )
    );
    header.append(context);
    if (options.onRefresh) {
      const refresh = operatorButton('chc-operator-refresh', labels.refresh);
      refresh.dataset.focus = 'refresh';
      refresh.addEventListener('click', () => {
        if (!destroyed) options.onRefresh?.();
      });
      header.append(refresh);
    }
    const toolbar = operatorNode('div', 'chc-operator-toolbar');
    const facets = operatorNode('div', 'chc-operator-filters');
    facets.setAttribute('role', 'group');
    facets.setAttribute('aria-label', labels.filtersGroup);
    for (const key of ['all', 'ready', 'on-court', 'finished', 'other'] as const) {
      const count = current.matches.filter(
        (match) => key === 'all' || (options.details?.[match.matchUpId]?.dayBucket ?? 'other') === key
      ).length;
      const control = operatorButton('', `${labels.filters[key]} ${count}`);
      control.dataset.focus = key;
      control.setAttribute('aria-pressed', String(filter === key));
      control.addEventListener('click', () => {
        if (!destroyed) {
          filter = key;
          install(key);
        }
      });
      facets.append(control);
    }
    const groupLabel = operatorNode('label', 'chc-operator-group-select', labels.groupBy);
    const select = document.createElement('select');
    select.dataset.focus = 'grouping';
    select.setAttribute('aria-label', labels.groupBy);
    for (const value of ['court', 'time'] as const) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = labels[value];
      option.selected = grouping === value;
      select.append(option);
    }
    select.addEventListener('change', () => {
      if (!destroyed) {
        grouping = select.value as OperatorGrouping;
        install('grouping');
      }
    });
    groupLabel.append(select);
    const groups = operatorDayGroups(current.matches, options.details ?? {}, filter, grouping, labels);
    const visible = groups.flatMap((group) => group.matches);
    const target = operatorNowMatch(visible, frame);
    const rows = new Map<string, HTMLElement>();
    const now = operatorButton('', labels.now);
    now.disabled = !target;
    now.addEventListener('click', () => {
      if (destroyed || !target) return undefined;
      const row = rows.get(target);
      row?.scrollIntoView({ block: 'center' });
      row?.focus({ preventScroll: true });
    });
    toolbar.append(groupLabel, now);
    const list = operatorNode('div', 'chc-operator-day-groups');
    if (!visible.length) list.append(operatorNode('p', 'chc-operator-empty', labels.noMatches));
    for (const group of groups) {
      const section = operatorNode('section', 'chc-operator-day-group');
      section.append(operatorNode('h2', 'chc-operator-group-heading', group.label));
      for (const match of group.matches) {
        const row = renderOperatorMatchRow(match, {
          ...options,
          dayFrame: frame,
          onOpenMatch: options.onOpenMatch
            ? (id) => {
                if (!destroyed) options.onOpenMatch?.(id);
              }
            : undefined
        });
        if (!options.onOpenMatch) row.tabIndex = -1;
        rows.set(match.matchUpId, row);
        section.append(row);
      }
      list.append(section);
    }
    body.replaceChildren(
      header,
      toolbar,
      facets,
      operatorNode(
        'p',
        'chc-operator-count',
        `${visible.length} ${current.complete ? labels.matches : labels.deliveredMatches}`
      ),
      list
    );
    status.update(viewState, frame);
    if (focusKey)
      [...body.querySelectorAll<HTMLElement>('[data-focus]')].find((node) => node.dataset.focus === focusKey)?.focus();
  }
  install();
  return {
    element,
    update(next: OperatorMatchListPage, nextState: OperatorViewState = {}) {
      if (destroyed) return undefined;
      const active = document.activeElement as HTMLElement | null;
      const focusKey = element.contains(active) ? active?.dataset.focus : undefined;
      page = next;
      viewState = { ...viewState, ...nextState };
      install(focusKey);
    },
    destroy() {
      destroyed = true;
      page = undefined;
      status.destroy();
      element.replaceChildren();
    }
  };
}
