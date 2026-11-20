import { defaultOperatorLabels, operatorFreshness } from './model';

// constants and types
import type { OperatorDayFrame, OperatorLabels, OperatorViewState } from './model';

/** One persistent live region; insert empty first, then change text in place. */
export function createOperatorStatus(labels: OperatorLabels = defaultOperatorLabels, frame?: OperatorDayFrame) {
  const element = document.createElement('div');
  element.className = 'chc-operator-status-bar';
  const access = document.createElement('span');
  access.className = 'chc-operator-access';
  const live = document.createElement('p');
  live.className = 'chc-operator-status';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  element.append(access, live);
  let destroyed = false;
  let version = 0;
  return {
    element,
    update(state: OperatorViewState, context = frame) {
      const current = ++version;
      const view = operatorFreshness(state, labels, context);
      access.textContent = (state.access ?? 'read-only') === 'read-only' ? labels.readOnly : '';
      access.hidden = !access.textContent;
      live.dataset.severity = view.severity;
      live.dataset.freshness = view.freshness;
      queueMicrotask(() => {
        if (!destroyed && current === version) live.textContent = [view.text, view.updated].filter(Boolean).join(' · ');
      });
    },
    destroy() {
      destroyed = true;
      live.textContent = '';
      access.textContent = '';
    }
  };
}
