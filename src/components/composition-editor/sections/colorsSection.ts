import type { CompositionEditorStore } from '../compositionEditorStore';
import type { CompositionEditorState, EditorPanel } from '../compositionEditorTypes';
import type { CompositionColors } from '../../../types';
import { ceField, ceFieldLabel, ceFieldControl, ceColorInput, ceTextInput } from '../styles';

interface ColorRowDef {
  key: keyof CompositionColors;
  label: string;
  hint?: string;
}

const COLOR_ROWS: ColorRowDef[] = [
  { key: 'border', label: 'MatchUp border' },
  { key: 'borderHover', label: 'MatchUp border (hover)' },
  { key: 'borderInlineStart', label: 'Left-edge accent' },
  { key: 'connector', label: 'Connector lines', hint: 'Use "transparent" to hide' },
  { key: 'matchUpBackground', label: 'MatchUp background' },
  { key: 'internalDividers', label: 'Participant dividers' },
  { key: 'score', label: '[Score] placeholder text' },
  { key: 'roundHeader', label: 'Round header' }
];

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

/** A row with a native <input type="color"> + a free-form text input.
 * Text input is the source of truth (so "transparent" / "rgb(...)" / "var(--x)" work);
 * color input mirrors when value is a 6-digit hex, otherwise stays at #000000 and is dimmed. */
function buildColorRow(
  def: ColorRowDef,
  current: string | undefined,
  onChange: (value: string | undefined) => void,
  disabled: boolean
): { element: HTMLElement; setValue: (v: string | undefined) => void } {
  const row = document.createElement('div');
  row.className = ceField();

  const label = document.createElement('span');
  label.className = ceFieldLabel();
  label.textContent = def.label;
  row.appendChild(label);

  const controlWrap = document.createElement('div');
  controlWrap.className = ceFieldControl();
  controlWrap.style.display = 'flex';
  controlWrap.style.gap = '0.4rem';
  controlWrap.style.alignItems = 'center';

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.className = ceColorInput();
  colorInput.disabled = disabled;

  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.className = ceTextInput();
  textInput.placeholder = def.hint || '#rrggbb or color name';
  textInput.disabled = disabled;
  textInput.style.flex = '1';

  function applyValue(value: string | undefined): void {
    textInput.value = value || '';
    if (value && HEX_PATTERN.test(value)) {
      colorInput.value = value;
      colorInput.style.opacity = '1';
    } else {
      colorInput.value = '#000000';
      colorInput.style.opacity = value ? '0.4' : '1';
    }
  }
  applyValue(current);

  colorInput.addEventListener('input', () => {
    textInput.value = colorInput.value;
    colorInput.style.opacity = '1';
    onChange(colorInput.value);
  });
  textInput.addEventListener('input', () => {
    const v = textInput.value.trim();
    if (v && HEX_PATTERN.test(v)) {
      colorInput.value = v;
      colorInput.style.opacity = '1';
    } else {
      colorInput.style.opacity = v ? '0.4' : '1';
    }
    onChange(v ? v : undefined);
  });

  controlWrap.appendChild(colorInput);
  controlWrap.appendChild(textInput);
  row.appendChild(controlWrap);

  return { element: row, setValue: applyValue };
}

export function buildColorsSection(store: CompositionEditorStore): EditorPanel {
  const root = document.createElement('div');
  const readOnly = store.getState().readOnly;

  const hint = document.createElement('div');
  hint.style.cssText =
    'font-size:0.7rem; color:var(--chc-text-secondary, #999); padding:0 0 0.4rem; line-height:1.3;';
  hint.textContent = 'Per-composition overrides. Leave blank to inherit from the selected theme.';
  root.appendChild(hint);

  const rowControls = COLOR_ROWS.map((def) => {
    const ctrl = buildColorRow(
      def,
      store.getState().colors?.[def.key] as string | undefined,
      (value) => store.setColorField(def.key, value),
      readOnly
    );
    root.appendChild(ctrl.element);
    return { def, ctrl };
  });

  // Inline-start width field (separate row because it's a length, not a color)
  const widthRow = document.createElement('div');
  widthRow.className = ceField();
  const widthLabel = document.createElement('span');
  widthLabel.className = ceFieldLabel();
  widthLabel.textContent = 'Left-edge width';
  widthRow.appendChild(widthLabel);
  const widthControl = document.createElement('div');
  widthControl.className = ceFieldControl();
  const widthInput = document.createElement('input');
  widthInput.type = 'text';
  widthInput.className = ceTextInput();
  widthInput.placeholder = 'e.g. 10px';
  widthInput.disabled = readOnly;
  widthInput.value = store.getState().colors?.borderInlineStartWidth || '';
  widthInput.addEventListener('input', () => {
    const v = widthInput.value.trim();
    store.setColorField('borderInlineStartWidth', v ? v : undefined);
  });
  widthControl.appendChild(widthInput);
  widthRow.appendChild(widthControl);
  root.appendChild(widthRow);

  // Clear button
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.textContent = 'Clear color overrides';
  clearBtn.disabled = readOnly;
  clearBtn.style.cssText =
    'margin-top:0.6rem; padding:0.25rem 0.5rem; font-size:0.75rem; cursor:pointer; ' +
    'background:transparent; border:1px solid var(--chc-border-secondary, #ccc); border-radius:4px;';
  clearBtn.addEventListener('click', () => store.clearColors());
  root.appendChild(clearBtn);

  function update(state: CompositionEditorState): void {
    for (const { def, ctrl } of rowControls) {
      ctrl.setValue(state.colors?.[def.key] as string | undefined);
    }
    widthInput.value = state.colors?.borderInlineStartWidth || '';
  }

  return { element: root, update };
}
