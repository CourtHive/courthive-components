import type { CompositionLimits, TopologyState, UIPanel } from '../types';

const EXPANDED = 'aria-expanded';
const LABELS: Record<keyof CompositionLimits, string> = {
  drawSize: 'Main draw size',
  maxWildcards: 'Wildcards per stage',
  maxAlternates: 'Alternates per stage',
  maxQualifiers: 'Qualifier places'
};

/** Only record-permitted increases get an input. The factory validates every request again. */
export function buildSanctionLimits(options: {
  read: () => { constraints?: CompositionLimits; overrideLimits?: CompositionLimits };
  change: (limits: CompositionLimits) => void;
}): UIPanel<TopologyState> {
  const element = document.createElement('div');
  element.className = 'tb-limits';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'tb-limits-toggle';
  toggle.textContent = 'Sanction limits';
  toggle.setAttribute(EXPANDED, 'false');
  const panel = document.createElement('div');
  panel.className = 'tb-limits-panel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Sanction limits');
  panel.hidden = true;
  let state: TopologyState;
  function render() {
    panel.replaceChildren();
    const { constraints, overrideLimits } = options.read();
    for (const key of Object.keys(LABELS) as (keyof CompositionLimits)[]) {
      const base = constraints?.[key];
      if (base === undefined) continue;
      const label = document.createElement('label');
      label.textContent = `${LABELS[key]}: ${base}`;
      const ceiling = overrideLimits?.[key];
      if (Number.isSafeInteger(ceiling) && ceiling! > base) {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = String(base);
        input.max = String(ceiling);
        input.step = '1';
        input.value = String(state.constraintOverrides?.[key] ?? base);
        input.setAttribute('aria-label', LABELS[key]);
        input.addEventListener('change', () => {
          if (!input.checkValidity() || !Number.isSafeInteger(input.valueAsNumber)) return;
          const limits = { ...state.constraintOverrides };
          if (input.valueAsNumber === base) delete limits[key];
          else limits[key] = input.valueAsNumber;
          options.change(limits);
        });
        label.append(input, ` (sanction permits up to ${ceiling})`);
      }
      panel.append(label);
    }
  }
  const close = () => {
    panel.hidden = true;
    toggle.setAttribute(EXPANDED, 'false');
  };
  toggle.addEventListener('click', () => {
    if (!panel.hidden) return close();
    render();
    panel.hidden = false;
    toggle.setAttribute(EXPANDED, 'true');
  });
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      close();
      toggle.focus();
    }
  });
  element.append(toggle, panel);
  return {
    element,
    update(next) {
      state = next;
      element.hidden = state.mode !== 'fit' || !Object.keys(options.read().constraints ?? {}).length;
      if (element.hidden) close();
      else if (!panel.hidden) render();
    }
  };
}
