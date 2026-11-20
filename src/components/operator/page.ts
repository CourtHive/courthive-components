import { renderOperatorMatchList } from './render';
import { defaultOperatorLabels } from './model';

// constants and types
import type { OperatorMatchPresentation } from 'tods-competition-factory/operator-types';
import type { OperatorRenderOptions } from './render';
import type { OperatorViewPhase } from './model';

/** Page composition over a bounded query result. The host selects the date/filter; this code never filters a tournament. */
export type OperatorMatchListPage = {
  readonly title: string;
  readonly dateLabel?: string;
  readonly matches: readonly OperatorMatchPresentation[];
};

export function createOperatorMatchListPage(
  initial: OperatorMatchListPage,
  options: OperatorRenderOptions & { onRefresh?: () => void; refreshLabel?: string } = {}
) {
  const element = document.createElement('section');
  element.className = 'chc-operator-page';
  let destroyed = false;
  function install(page: OperatorMatchListPage, phase: OperatorViewPhase) {
    if (destroyed) return;
    const refreshHadFocus = element.querySelector('.chc-operator-refresh') === document.activeElement;
    const header = document.createElement('header');
    header.className = 'chc-operator-page-header';
    const context = document.createElement('div');
    const title = document.createElement('h1');
    title.textContent = page.title;
    context.append(title);
    if (page.dateLabel) {
      const date = document.createElement('p');
      date.textContent = page.dateLabel;
      context.append(date);
    }
    header.append(context);
    if (options.onRefresh) {
      const refresh = document.createElement('button');
      refresh.className = 'chc-operator-refresh';
      refresh.type = 'button';
      refresh.textContent = options.refreshLabel ?? 'Refresh';
      refresh.addEventListener('click', () => {
        if (!destroyed) options.onRefresh?.();
      });
      header.append(refresh);
    }
    const list = renderOperatorMatchList(page.matches, {
      ...options,
      labels: options.labels ?? defaultOperatorLabels,
      phase,
      onOpenMatch: options.onOpenMatch
        ? (matchUpId) => {
            if (!destroyed) options.onOpenMatch?.(matchUpId);
          }
        : undefined
    });
    element.replaceChildren(header, list);
    if (refreshHadFocus) element.querySelector<HTMLButtonElement>('.chc-operator-refresh')?.focus();
  }
  install(initial, options.phase ?? 'read-only');
  return {
    element,
    update(page: OperatorMatchListPage, phase: OperatorViewPhase) {
      install(page, phase);
    },
    destroy() {
      destroyed = true;
      element.replaceChildren();
    }
  };
}
