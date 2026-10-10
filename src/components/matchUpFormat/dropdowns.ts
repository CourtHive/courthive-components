/**
 * The picker's two dropdowns: a plain list of choices, and the game-format chooser. Moved out of
 * matchUpFormat.ts unchanged except that they are given their labels instead of reading module state.
 */

const CHC_TEXT_PRIMARY = 'var(--chc-text-primary)';
const CHC_DROPDOWN_BG = 'var(--chc-dropdown-bg)';
const CHC_HOVER_BG = 'var(--chc-hover-bg)';

export interface DropdownItem {
  text: string;
  onClick: () => void;
}

// Track the currently open dropdown so opening another one closes it
let currentDropdown: HTMLElement | null = null;
let currentCleanupListener: ((event: MouseEvent) => void) | null = null;

export function closeCurrentDropdown(): void {
  if (currentDropdown && document.body.contains(currentDropdown)) {
    currentDropdown.remove();
  }
  if (currentCleanupListener) {
    document.removeEventListener('click', currentCleanupListener);
    currentCleanupListener = null;
  }
  currentDropdown = null;
}

function showBelow(e: Event, dropdown: HTMLElement): void {
  const rect = (e.target as HTMLElement).getBoundingClientRect();
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom}px`;
  document.body.appendChild(dropdown);
  currentDropdown = dropdown;

  // Close on a click outside, after a short delay so the opening click does not close it at once
  setTimeout(() => {
    currentCleanupListener = (event: MouseEvent) => {
      if (!dropdown.contains(event.target as Node)) closeCurrentDropdown();
    };
    document.addEventListener('click', currentCleanupListener);
  }, 100);
}

function newDropdown(): { dropdown: HTMLElement; menu: HTMLElement } {
  const dropdown = document.createElement('div');
  dropdown.className = 'dropdown is-active';
  dropdown.style.position = 'absolute';
  dropdown.style.zIndex = '10000'; // Higher than the modal (9999)

  const menu = document.createElement('div');
  menu.className = 'dropdown-menu';
  menu.style.backgroundColor = CHC_DROPDOWN_BG;
  menu.style.border = '1px solid var(--chc-border-secondary)';
  menu.style.borderRadius = '4px';
  menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  dropdown.appendChild(menu);
  return { dropdown, menu };
}

function hoverable(element: HTMLElement): void {
  element.onmouseenter = () => {
    element.style.backgroundColor = CHC_HOVER_BG;
    element.style.color = CHC_TEXT_PRIMARY;
  };
  element.onmouseleave = () => {
    element.style.backgroundColor = CHC_DROPDOWN_BG;
    element.style.color = CHC_TEXT_PRIMARY;
  };
}

export function createDropdown(e: Event, items: DropdownItem[]): void {
  closeCurrentDropdown();
  const { dropdown, menu } = newDropdown();

  for (const item of items) {
    const itemDiv = document.createElement('div');
    // Not the dropdown-item class: it can carry conflicting styles
    itemDiv.style.padding = '0.5em 1em';
    itemDiv.style.cursor = 'pointer';
    itemDiv.style.backgroundColor = CHC_DROPDOWN_BG;
    itemDiv.style.color = CHC_TEXT_PRIMARY;
    itemDiv.style.fontSize = '1rem';
    itemDiv.style.lineHeight = '1.5';
    itemDiv.textContent = item.text;
    itemDiv.onclick = (clickEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      // Remove the dropdown first, then act, synchronously
      closeCurrentDropdown();
      item.onClick();
    };
    hoverable(itemDiv);
    menu.appendChild(itemDiv);
  }

  showBelow(e, dropdown);
}

type GameFormat =
  { type: 'CONSECUTIVE'; count: number; deuceAfter?: number } | { type: 'TRADITIONAL'; deuceAfter?: number };

function buildGameFormat(type: string, deuce: string): GameFormat | undefined {
  if (type === 'none' && deuce === 'none') return undefined;
  let gameFormat: any;
  if (/^\d+C$/.test(type)) gameFormat = { type: 'CONSECUTIVE', count: Number(type.slice(0, -1)) };
  else gameFormat = { type: 'TRADITIONAL' }; // a deuce rule without an explicit type is traditional
  if (deuce !== 'none') gameFormat.deuceAfter = Number(deuce.slice(0, -1));
  return gameFormat;
}

export function createGameFormatDropdown(
  e: Event,
  currentGameFormat: GameFormat | undefined,
  labels: any,
  onUpdate: (gameFormat?: GameFormat) => void
): void {
  closeCurrentDropdown();
  const { dropdown, menu } = newDropdown();
  menu.style.padding = '0.25em 0';
  menu.style.minWidth = '180px';

  let currentType = 'none';
  let currentDeuce = 'none';
  if (currentGameFormat?.type === 'TRADITIONAL') currentType = 'TN';
  else if (currentGameFormat?.type === 'CONSECUTIVE') currentType = `${currentGameFormat.count}C`;
  if (currentGameFormat?.deuceAfter) currentDeuce = `${currentGameFormat.deuceAfter}D`;

  const none = labels.none || 'None';
  const onRadioChange = () => {
    const typeRadio = dropdown.querySelector('input[name="gameType"]:checked') as HTMLInputElement;
    const deuceRadio = dropdown.querySelector('input[name="deuceRule"]:checked') as HTMLInputElement;
    onUpdate(buildGameFormat(typeRadio?.value || 'none', deuceRadio?.value || 'none'));
  };

  const itemStyle =
    'padding: 0.4em 1em; cursor: pointer; background-color: var(--chc-dropdown-bg); color: var(--chc-text-primary); font-size: 1rem;';
  const headerStyle =
    'padding: 0.3em 1em; font-weight: bold; font-size: 0.85rem; color: var(--chc-text-muted); text-transform: uppercase; letter-spacing: 0.5px;';
  const separatorStyle = 'border-top: 1px solid #eee; margin: 0.25em 0;';

  // "None" at the top clears everything and closes the dropdown
  const noneItem = document.createElement('div');
  noneItem.textContent = none;
  noneItem.style.cssText = itemStyle;
  hoverable(noneItem);
  noneItem.onclick = (clickEvent) => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    onUpdate(undefined);
    closeCurrentDropdown();
  };
  menu.appendChild(noneItem);

  const radioRow = (name: string, value: string, label: string, checked: boolean): HTMLElement => {
    const row = document.createElement('label');
    row.style.cssText =
      'display: flex; align-items: center; padding: 0.3em 1em; cursor: pointer; gap: 0.4em; font-size: 1rem; color: var(--chc-text-primary);';
    hoverable(row);
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = value;
    radio.checked = checked;
    radio.style.margin = '0';
    radio.onchange = onRadioChange;
    const span = document.createElement('span');
    span.textContent = label;
    row.append(radio, span);
    return row;
  };

  const section = (header: string, name: string, options: { value: string; label: string }[], current: string) => {
    const separator = document.createElement('div');
    separator.style.cssText = separatorStyle;
    const heading = document.createElement('div');
    heading.style.cssText = headerStyle;
    heading.textContent = header;
    menu.append(separator, heading, ...options.map((o) => radioRow(name, o.value, o.label, current === o.value)));
  };

  section(
    labels.gameType || 'Game type',
    'gameType',
    [
      { value: 'none', label: none },
      { value: 'TN', label: labels.traditional || 'Traditional' },
      { value: '2C', label: labels.consecutive2 || '2 consecutive' },
      { value: '3C', label: labels.consecutive3 || '3 consecutive' },
      { value: '4C', label: labels.consecutive4 || '4 consecutive' }
    ],
    currentType
  );
  section(
    labels.deuceRule || 'Deuce rule',
    'deuceRule',
    [
      { value: 'none', label: none },
      { value: '1D', label: labels.goldenPoint || 'Golden point' },
      { value: '3D', label: labels.starPoint || 'Star point' }
    ],
    currentDeuce
  );

  showBelow(e, dropdown);
}
