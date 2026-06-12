/**
 * Small chip-list editor used by the "Allowed match-up formats" section
 * and each of the six status-code refinement groups. Repeats the same
 * UX: existing items render as removable chips, a single text input +
 * Add button appends new values.
 *
 * The host owns the array — the editor only emits add(value) /
 * remove(index). State for the input text is purely local DOM.
 */

export interface TagListEditorConfig {
  values: string[];
  placeholder?: string;
  readonly?: boolean;
  validate?: (value: string) => boolean;
  invalidMessage?: string;
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}

export interface TagListEditorHandle {
  element: HTMLElement;
  setValues(values: string[]): void;
  destroy(): void;
}

export function buildTagListEditor(config: TagListEditorConfig): TagListEditorHandle {
  const root = document.createElement('div');
  root.className = 'sc-taglist';

  const chipsWrap = document.createElement('div');
  chipsWrap.className = 'sc-taglist-chips';
  root.appendChild(chipsWrap);

  const inputRow = document.createElement('div');
  inputRow.className = 'sc-taglist-input-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'sc-taglist-input';
  if (config.placeholder) input.placeholder = config.placeholder;
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'sp-btn sp-btn--sm sp-btn--outline';
  addBtn.textContent = 'Add';
  const errorEl = document.createElement('div');
  errorEl.className = 'sc-taglist-error';
  errorEl.style.display = 'none';
  inputRow.appendChild(input);
  inputRow.appendChild(addBtn);
  root.appendChild(inputRow);
  root.appendChild(errorEl);

  let values = [...config.values];

  function renderChips(): void {
    chipsWrap.innerHTML = '';
    if (values.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'sc-taglist-empty';
      empty.textContent = 'none';
      chipsWrap.appendChild(empty);
      return;
    }
    values.forEach((value, index) => {
      const chip = document.createElement('span');
      chip.className = 'sc-taglist-chip';
      const text = document.createElement('code');
      text.textContent = value;
      chip.appendChild(text);
      if (!config.readonly) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'sc-taglist-chip-remove';
        remove.setAttribute('aria-label', `Remove ${value}`);
        remove.textContent = '×';
        remove.addEventListener('click', () => config.onRemove(index));
        chip.appendChild(remove);
      }
      chipsWrap.appendChild(chip);
    });
  }

  function attemptAdd(): void {
    const raw = input.value.trim();
    if (!raw) return;
    if (config.validate && !config.validate(raw)) {
      errorEl.textContent = config.invalidMessage ?? 'Invalid value';
      errorEl.style.display = '';
      return;
    }
    errorEl.style.display = 'none';
    input.value = '';
    config.onAdd(raw);
  }

  addBtn.addEventListener('click', attemptAdd);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      attemptAdd();
    }
  });

  if (config.readonly) {
    input.disabled = true;
    addBtn.disabled = true;
    inputRow.style.display = 'none';
  }

  renderChips();

  return {
    element: root,
    setValues(next: string[]) {
      values = [...next];
      renderChips();
    },
    destroy() {
      root.remove();
    },
  };
}
