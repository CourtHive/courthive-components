import { TEAM_COLOR_ROLES, normalizeTeamPalette } from '../scorecard/teamPalette';
import { teamDisplayOption } from './teamDisplayElements';

// constants and types
import type { TeamPaletteColor, TeamColorRole, TeamColors } from '../scorecard/teamPalette';

let editorSequence = 0;
const defaultLabels: Record<string, string> = {
  palette: 'Team colors and default display',
  addColor: 'Add color',
  clearPalette: 'Clear palette',
  chooseColor: 'Use theme default',
  missingColor: 'Missing palette color',
  color: 'Color',
  colorname: 'Name',
  colorvalue: 'Hex value',
  colorgroup: 'Group',
  moveColorUp: 'Move up',
  removeColor: 'Remove color',
  invalidPalette: 'Check colors and role assignments. Every assigned role must reference an existing palette color.',
  'team.surface': 'Team background',
  'team.text': 'Team text',
  'team.accent': 'Team accent',
  'score.surface': 'Score background',
  'score.text': 'Score text'
};

/** Own the full CODES palette; changing display selections never drops unselected entries. */
export function renderTeamColorsEditor(target: HTMLElement, initial: unknown, labels: Record<string, string> = {}) {
  const text = (key: string) => labels[key] ?? defaultLabels[key] ?? key;
  const normalized = normalizeTeamPalette(initial);
  const emptyObject =
    initial != null &&
    typeof initial === 'object' &&
    Object.prototype.toString.call(initial) === '[object Object]' &&
    !Object.keys(initial).length;
  const hasInitial = initial != null && !emptyObject;
  let unreadable = hasInitial && !normalized;
  let palette: TeamPaletteColor[] = normalized?.palette ?? [];
  const roles = { ...normalized?.display?.roles };
  const selections = new Map<TeamColorRole, ReturnType<typeof select>>();
  const root = document.createElement('section');
  root.className = 'team-palette-editor';
  const title = document.createElement('h3');
  title.textContent = text('palette');
  const rows = document.createElement('div');
  const error = document.createElement('p');
  error.setAttribute('role', 'alert');
  for (const role of TEAM_COLOR_ROLES) {
    selections.set(
      role,
      select(role, (value) => {
        if (value) roles[role] = value;
        else delete roles[role];
      })
    );
  }
  const add = button('addColor', () => {
    const existingIds = new Set(palette.map((entry) => entry.colorId));
    let colorId: string;
    do {
      // getRandomValues also works on plain HTTP venue networks; removed IDs are never deliberately reused.
      const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
      colorId = `color-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    } while (existingIds.has(colorId));
    palette.push({ colorId, value: '' });
    unreadable = false;
    render();
  });
  const clear = button('clearPalette', () => {
    palette = [];
    for (const role of TEAM_COLOR_ROLES) delete roles[role];
    unreadable = false;
    render();
  });
  root.append(title, rows, ...[...selections.values()].map((selection) => selection.wrapper), add, clear, error);
  target.appendChild(root);
  render();

  function button(key: string, callback: () => void) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'button';
    element.textContent = text(key);
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      callback();
    });
    return element;
  }
  function select(key: string, change: (value: string) => void) {
    const wrapper = document.createElement('div');
    wrapper.className = 'field font-medium';
    const label = document.createElement('label');
    label.textContent = text(key);
    const input = document.createElement('select');
    input.className = 'input font-medium';
    input.id = `team-palette-${String(++editorSequence)}`;
    label.htmlFor = input.id;
    input.addEventListener('change', () => change(input.value));
    wrapper.append(label, input);
    return { wrapper, input };
  }
  function choices() {
    for (const [role, selection] of selections) {
      const input = selection.input;
      const selected = roles[role] ?? '';
      input.replaceChildren();
      const empty = teamDisplayOption(text('chooseColor'), '');
      input.appendChild(empty);
      for (const [index, entry] of palette.entries()) {
        input.appendChild(teamDisplayOption(entry.name || `${text('color')} ${index + 1}`, entry.colorId));
      }
      if (selected && !palette.some((entry) => entry.colorId === selected)) {
        const missing = teamDisplayOption(text('missingColor'), selected);
        missing.disabled = true;
        input.appendChild(missing);
      }
      input.value = selected;
    }
  }
  function field(row: HTMLElement, entry: TeamPaletteColor, key: 'name' | 'value' | 'group') {
    const label = document.createElement('label');
    label.className = 'field font-medium';
    label.style.display = 'block';
    label.textContent = text(`color${key}`);
    const input = document.createElement('input');
    input.className = 'input';
    input.value = entry[key] ?? '';
    input.placeholder = key === 'value' ? '#RRGGBB' : text(`color${key}`);
    input.maxLength = key === 'value' ? 7 : 100;
    input.addEventListener('input', () => {
      if (key === 'value') entry.value = input.value;
      else if (input.value.trim()) entry[key] = input.value;
      else delete entry[key];
      choices();
    });
    label.appendChild(input);
    row.appendChild(label);
  }
  function render() {
    rows.replaceChildren();
    for (const [index, entry] of palette.entries()) {
      const row = document.createElement('div');
      row.className = 'team-palette-row';
      row.style.marginBlockEnd = '1rem';
      row.style.borderBottom = '1px solid var(--tmx-border-primary)';
      row.dataset.colorId = entry.colorId;
      for (const key of ['name', 'value', 'group'] as const) field(row, entry, key);
      const move = button('moveColorUp', () => {
        [palette[index - 1], palette[index]] = [palette[index], palette[index - 1]];
        render();
      });
      move.disabled = index === 0;
      row.append(
        move,
        button('removeColor', () => {
          palette.splice(index, 1);
          render();
        })
      );
      rows.appendChild(row);
    }
    choices();
    error.textContent = unreadable ? text('invalidPalette') : '';
  }
  function read(): TeamColors | Record<string, never> | undefined {
    if (!unreadable && !palette.length) return {};
    const value = normalizeTeamPalette({ palette, display: { roles } });
    error.textContent = value ? '' : text('invalidPalette');
    return unreadable ? undefined : value;
  }
  return { read };
}
