/**
 * Print composition editor — the courthive-components element that
 * authors a `PrintCompositionConfig` (mirrors pdf-factory's
 * `CompositionConfig`).
 *
 * Two-column layout: left = form sections (Page / Header / Footer / Content),
 * right = info aside (print-type pill, JSON preview stub).
 *
 * Live PDF preview is intentionally deferred — the JSON-stub aside surfaces
 * the in-progress config so admin-client can wire its own preview pane
 * later (or render via pdf-factory's generators directly).
 *
 * See `Mentat/planning/PRINT_COMPOSITION_POLICY_PLAN.md` for the
 * end-to-end architecture.
 */

import './print-composition-editor.css';
import type {
  PrintCompositionConfig,
  PrintCompositionEditorConfig,
  PrintCompositionEditorHandle,
  PrintType,
  HeaderLayout,
  FooterLayout,
  PageSize,
  PageOrientation,
} from './printCompositionEditorTypes';

const HEADER_LAYOUTS: HeaderLayout[] = ['grand-slam', 'itf', 'minimal', 'none'];
const FOOTER_LAYOUTS: FooterLayout[] = ['standard', 'seedings', 'officials', 'none'];
const PAGE_SIZES: PageSize[] = ['a4', 'letter'];
const PAGE_ORIENTATIONS: PageOrientation[] = ['auto', 'portrait', 'landscape'];

const DEFAULT_CONFIG: PrintCompositionConfig = {
  page: {
    pageSize: 'a4',
    orientation: 'auto',
    margins: { top: 15, right: 10, bottom: 15, left: 10 },
  },
  header: { layout: 'itf', tournamentName: '' },
  footer: { layout: 'standard', showTimestamp: true, showPageNumbers: true },
  content: {},
};

export function createPrintCompositionEditor(
  container: HTMLElement,
  config: PrintCompositionEditorConfig,
): PrintCompositionEditorHandle {
  const state: PrintCompositionConfig = mergeConfig(DEFAULT_CONFIG, config.config ?? {});
  const readOnly = !!config.readOnly;

  const root = el('div', 'pce-root');
  const form = el('div', 'pce-form');
  const aside = el('div', 'pce-aside');
  root.appendChild(form);
  root.appendChild(aside);

  // Sections rebuilt from state on every change to keep code simple.
  let previewBody: HTMLElement | null = null;

  function rerender(): void {
    form.innerHTML = '';
    form.appendChild(buildPageSection(state, readOnly, onChange));
    form.appendChild(buildHeaderSection(state, readOnly, onChange));
    form.appendChild(buildFooterSection(state, readOnly, onChange));
    form.appendChild(buildContentSection(state, readOnly, config.printType, onChange));
    if (!readOnly && config.onSave) {
      form.appendChild(buildActions(() => config.onSave?.(deepClone(state))));
    }

    aside.innerHTML = '';
    const title = el('div', 'pce-aside-title');
    title.textContent = 'Print Type';
    aside.appendChild(title);
    const pill = el('span', 'pce-print-type-pill');
    pill.textContent = config.printType;
    aside.appendChild(pill);
    const previewTitle = el('div', 'pce-aside-title');
    previewTitle.textContent = 'Resolved Config';
    previewTitle.style.marginTop = '8px';
    aside.appendChild(previewTitle);
    previewBody = el('div', 'pce-preview-stub');
    previewBody.textContent = JSON.stringify(state, null, 2);
    aside.appendChild(previewBody);
    const note = el('div', 'pce-preview-note');
    note.textContent = 'Live PDF preview not yet wired — see admin-client integration.';
    aside.appendChild(note);
  }

  function onChange(): void {
    if (previewBody) previewBody.textContent = JSON.stringify(state, null, 2);
    config.onChange?.(deepClone(state));
  }

  rerender();
  container.appendChild(root);

  return {
    destroy: () => {
      if (root.parentNode) root.parentNode.removeChild(root);
    },
    getConfig: () => deepClone(state),
    setConfig: (next: PrintCompositionConfig) => {
      Object.assign(state, mergeConfig(DEFAULT_CONFIG, next));
      rerender();
    },
  };
}

// ── Sections ──────────────────────────────────────────────────────────────────

function buildPageSection(
  state: PrintCompositionConfig,
  readOnly: boolean,
  onChange: () => void,
): HTMLElement {
  const { section, body } = makeSection('Page');
  body.appendChild(
    selectField('Size', PAGE_SIZES, state.page?.pageSize ?? 'a4', readOnly, (v) => {
      ensureBlock(state, 'page').pageSize = v as PageSize;
      onChange();
    }),
  );
  body.appendChild(
    selectField('Orientation', PAGE_ORIENTATIONS, state.page?.orientation ?? 'auto', readOnly, (v) => {
      ensureBlock(state, 'page').orientation = v as PageOrientation;
      onChange();
    }),
  );
  // Margins compressed into one row of 4 inputs
  const marginsField = el('div', 'pce-field pce-field-full');
  marginsField.appendChild(labelEl('Margins (mm)'));
  const row = el('div');
  row.style.display = 'grid';
  row.style.gridTemplateColumns = 'repeat(4, 1fr)';
  row.style.gap = '6px';
  (['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
    row.appendChild(
      numberField(side, state.page?.margins?.[side] ?? 10, readOnly, (n) => {
        const margins = ensureBlock(ensureBlock(state, 'page'), 'margins') as Record<string, number>;
        margins[side] = n;
        onChange();
      }),
    );
  });
  marginsField.appendChild(row);
  body.appendChild(marginsField);
  return section;
}

function buildHeaderSection(
  state: PrintCompositionConfig,
  readOnly: boolean,
  onChange: () => void,
): HTMLElement {
  const { section, body } = makeSection('Header');
  body.appendChild(
    selectField('Layout', HEADER_LAYOUTS, state.header?.layout ?? 'itf', readOnly, (v) => {
      ensureBlock(state, 'header').layout = v as HeaderLayout;
      onChange();
    }),
  );
  body.appendChild(
    textField('Tournament name', state.header?.tournamentName ?? '', readOnly, (v) => {
      ensureBlock(state, 'header').tournamentName = v;
      onChange();
    }),
  );
  body.appendChild(
    textField('Subtitle', state.header?.subtitle ?? '', readOnly, (v) => {
      ensureBlock(state, 'header').subtitle = v || undefined;
      onChange();
    }),
  );
  return section;
}

function buildFooterSection(
  state: PrintCompositionConfig,
  readOnly: boolean,
  onChange: () => void,
): HTMLElement {
  const { section, body } = makeSection('Footer');
  body.appendChild(
    selectField('Layout', FOOTER_LAYOUTS, state.footer?.layout ?? 'standard', readOnly, (v) => {
      ensureBlock(state, 'footer').layout = v as FooterLayout;
      onChange();
    }),
  );
  body.appendChild(
    checkboxField('Show timestamp', state.footer?.showTimestamp ?? true, readOnly, (v) => {
      ensureBlock(state, 'footer').showTimestamp = v;
      onChange();
    }),
  );
  body.appendChild(
    checkboxField('Show page numbers', state.footer?.showPageNumbers ?? true, readOnly, (v) => {
      ensureBlock(state, 'footer').showPageNumbers = v;
      onChange();
    }),
  );
  return section;
}

function buildContentSection(
  state: PrintCompositionConfig,
  readOnly: boolean,
  printType: PrintType,
  onChange: () => void,
): HTMLElement {
  const { section, body } = makeSection(`Content — ${printType}`);
  if (printType === 'draw') {
    const draw = ensureBlock(ensureBlock(state, 'content'), 'draw') as Record<string, any>;
    body.appendChild(
      checkboxField('Include seedings', !!draw.includeSeedings, readOnly, (v) => {
        draw.includeSeedings = v;
        onChange();
      }),
    );
    body.appendChild(
      checkboxField('Include scores', !!draw.includeScores, readOnly, (v) => {
        draw.includeScores = v;
        onChange();
      }),
    );
    body.appendChild(
      checkboxField('Show byes', !!draw.showByes, readOnly, (v) => {
        draw.showByes = v;
        onChange();
      }),
    );
    body.appendChild(
      checkboxField('Show draw positions', !!draw.showDrawPositions, readOnly, (v) => {
        draw.showDrawPositions = v;
        onChange();
      }),
    );
  } else if (printType === 'schedule') {
    const sched = ensureBlock(ensureBlock(state, 'content'), 'schedule') as Record<string, any>;
    body.appendChild(
      selectField('Cell style', ['detailed', 'compact'], sched.cellStyle ?? 'detailed', readOnly, (v) => {
        sched.cellStyle = v;
        onChange();
      }),
    );
    body.appendChild(
      checkboxField('Show match numbers', !!sched.showMatchNumbers, readOnly, (v) => {
        sched.showMatchNumbers = v;
        onChange();
      }),
    );
    body.appendChild(
      textField('Alert banner', sched.alertBanner ?? '', readOnly, (v) => {
        sched.alertBanner = v || undefined;
        onChange();
      }),
    );
  } else {
    const placeholder = el('div', 'pce-field pce-field-full');
    const note = el('div', 'pce-preview-note');
    note.textContent = `Content options for "${printType}" not yet implemented.`;
    placeholder.appendChild(note);
    body.appendChild(placeholder);
  }
  return section;
}

function buildActions(onSave: () => void): HTMLElement {
  const wrap = el('div', 'pce-actions');
  const save = el('button', 'pce-button pce-button-primary') as HTMLButtonElement;
  save.type = 'button';
  save.textContent = 'Save';
  save.addEventListener('click', onSave);
  wrap.appendChild(save);
  return wrap;
}

// ── Field builders ────────────────────────────────────────────────────────────

function selectField(
  label: string,
  options: readonly string[],
  value: string,
  disabled: boolean,
  onChange: (v: string) => void,
): HTMLElement {
  const wrap = el('div', 'pce-field');
  wrap.appendChild(labelEl(label));
  const select = el('select', 'pce-select') as HTMLSelectElement;
  select.disabled = disabled;
  options.forEach((opt) => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    select.appendChild(o);
  });
  select.addEventListener('change', () => onChange(select.value));
  wrap.appendChild(select);
  return wrap;
}

function textField(label: string, value: string, disabled: boolean, onChange: (v: string) => void): HTMLElement {
  const wrap = el('div', 'pce-field');
  wrap.appendChild(labelEl(label));
  const input = el('input', 'pce-input') as HTMLInputElement;
  input.type = 'text';
  input.value = value;
  input.disabled = disabled;
  input.addEventListener('input', () => onChange(input.value));
  wrap.appendChild(input);
  return wrap;
}

function numberField(label: string, value: number, disabled: boolean, onChange: (n: number) => void): HTMLElement {
  const wrap = el('div', 'pce-field');
  wrap.appendChild(labelEl(label));
  const input = el('input', 'pce-input') as HTMLInputElement;
  input.type = 'number';
  input.value = String(value);
  input.disabled = disabled;
  input.addEventListener('input', () => {
    const n = parseFloat(input.value);
    if (!Number.isNaN(n)) onChange(n);
  });
  wrap.appendChild(input);
  return wrap;
}

function checkboxField(
  label: string,
  value: boolean,
  disabled: boolean,
  onChange: (v: boolean) => void,
): HTMLElement {
  const wrap = el('div', 'pce-field pce-checkbox-row pce-field-full');
  const input = el('input') as HTMLInputElement;
  input.type = 'checkbox';
  input.checked = value;
  input.disabled = disabled;
  input.addEventListener('change', () => onChange(input.checked));
  wrap.appendChild(input);
  const lbl = labelEl(label);
  lbl.style.fontSize = '13px';
  lbl.style.color = 'var(--chc-text-primary, #222)';
  wrap.appendChild(lbl);
  return wrap;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSection(title: string): { section: HTMLElement; body: HTMLElement } {
  const section = el('div', 'pce-section');
  const header = el('div', 'pce-section-header');
  header.textContent = title;
  const body = el('div', 'pce-section-body');
  section.appendChild(header);
  section.appendChild(body);
  return { section, body };
}

function el(tag: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function labelEl(text: string): HTMLElement {
  const l = el('label', 'pce-field-label');
  l.textContent = text;
  return l;
}

function ensureBlock<T extends object, K extends keyof T>(parent: T, key: K): NonNullable<T[K]> {
  if (parent[key] === undefined || parent[key] === null) {
    (parent as any)[key] = {} as any;
  }
  return parent[key] as NonNullable<T[K]>;
}

function mergeConfig(base: PrintCompositionConfig, overlay: PrintCompositionConfig): PrintCompositionConfig {
  return {
    name: overlay.name ?? base.name,
    page: { ...base.page, ...overlay.page, margins: { ...base.page?.margins, ...overlay.page?.margins } },
    header: { ...base.header, ...overlay.header },
    footer: { ...base.footer, ...overlay.footer },
    content: { ...base.content, ...overlay.content },
  };
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
