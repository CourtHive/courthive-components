/**
 * Control bar component for tables.
 * Dynamically generates search fields, buttons, and dropdown menus based on configuration.
 */
import { removeAllChildNodes } from '../modal/cmodal';
import { dropDownButton } from '../button/dropDownButton';
import { selectItem } from '../modal/selectItem';
import { barButton } from '../button/barButton';
import { isFunction, isObject } from '../../helpers/typeOf';
import { validator } from '../forms/renderValidator';
import { toggleOverlay } from './toggleOverlay';

// constants
const CENTER = 'center';
const HEADER = 'header';
const EMPTY_STRING = '';
const LEFT = 'left';
const NONE = 'none';
const OVERLAY = 'overlay';
const RIGHT = 'right';
const BUTTON_BAR = 'buttonBar';
const TOP = 'top';

export function controlBar(params: {
  table?: any;
  targetClassName?: string;
  items?: any[];
  onSelection?: (rows: any[]) => void;
  target?: HTMLElement;
  selectItemFn?: (params: any) => void;
}): { elements: Record<string, HTMLElement>; inputs: Record<string, HTMLInputElement> } {
  const { table, targetClassName, items = [], onSelection, selectItemFn } = params;
  let { target } = params;
  const buildElement = !!target;
  if (!target && targetClassName) {
    target = document.getElementsByClassName(targetClassName)?.[0] as HTMLElement;
  }
  if (!target) return { elements: {}, inputs: {} };

  let overlayCount = 0;
  let headerCount = 0;

  const elements: Record<string, HTMLElement> = {};
  const inputs: Record<string, HTMLInputElement> = {};
  let focus: HTMLInputElement | undefined;

  if (buildElement) {
    removeAllChildNodes(target);
    const result = createControlElement();
    Object.assign(elements, result.elements);
    target.appendChild(result.anchor);
  }

  const locations: Record<string, HTMLElement | undefined> = Object.assign(
    {},
    ...[OVERLAY, LEFT, CENTER, RIGHT, HEADER]
      .map((location) => {
        const elem = target.getElementsByClassName(`options_${location}`)?.[0] as HTMLElement;
        removeAllChildNodes(elem);
        return { [location]: elem };
      })
      .filter(Boolean),
  );

  const stateChange = toggleOverlay({ table, target: target } as any);

  const onClick = (e: any, itemConfig: any) => {
    if (!isFunction(itemConfig.onClick)) return;
    e.stopPropagation();
    if (!itemConfig.disabled) itemConfig.onClick(e, table);
    if (itemConfig.stateChange) stateChange();
  };

  const defaultItem = { onClick: () => {}, location: RIGHT };
  for (const item of items) {
    const itemConfig: any = { ...defaultItem };
    if (isObject(item)) Object.assign(itemConfig, item);

    const location = locations[itemConfig.location];
    if (!location) {
      console.log(itemConfig.location, locations);
      continue;
    }

    if (itemConfig.location === OVERLAY) overlayCount += 1;
    if (itemConfig.location === HEADER) {
      if (isFunction(itemConfig.headerClick)) {
        const headerElement = target.getElementsByClassName('panelHeader')[0] as HTMLElement;
        if (headerElement) headerElement.onclick = itemConfig.headerClick;
      }
      headerCount += 1;
    }

    if (!itemConfig.hide && (itemConfig.input || itemConfig.placeholder || itemConfig.search)) {
      const elem = document.createElement('p');
      elem.style.cssText = 'margin-right: 1em';
      elem.className = `control ${itemConfig.search ? 'has-icons-left has-icons-right' : ''}`;
      const input = document.createElement('input');
      if (itemConfig.focus) focus = input;
      input.className = 'input font-medium';
      input.setAttribute('type', 'text');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('placeholder', item.placeholder || EMPTY_STRING);
      if (itemConfig.id) inputs[itemConfig.id] = input;
      if (itemConfig.id) input.setAttribute('id', itemConfig.id);
      if (itemConfig.onKeyDown) input.addEventListener('keydown', (e) => itemConfig.onKeyDown(e, itemConfig));
      if (itemConfig.onChange) input.addEventListener('change', (e) => itemConfig.onChange(e, itemConfig));
      if (itemConfig.onKeyUp)
        input.addEventListener('keyup', (e) => {
          if (itemConfig.clearSearch && e.key === 'Escape') {
            e.stopPropagation();
            input.value = '';
            itemConfig.clearSearch();
          }
          itemConfig.onKeyUp(e, itemConfig);
        });
      if (itemConfig.class) input.classList.add(itemConfig.class);
      if (itemConfig.visible === false) elem.style.display = NONE;
      if (itemConfig.value) input.value = itemConfig.value;
      elem.appendChild(input);

      if (itemConfig.search) {
        const span = document.createElement('span');
        span.className = 'icon is-small is-left font-medium';
        span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/></svg>`;
        elem.appendChild(span);

        if (isFunction(itemConfig.clearSearch)) {
          const clear = document.createElement('span');
          clear.className = 'icon is-small is-right font-medium';
          clear.style.pointerEvents = 'all';
          clear.style.cursor = 'pointer';
          clear.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="#dddada"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>`;
          clear.onclick = (e) => {
            e.stopPropagation();
            input.value = '';
            itemConfig.clearSearch();
          };
          elem.appendChild(clear);
        }
      }

      if (item.validator) {
        const help = document.createElement('p');
        help.className = 'help font-medium';
        elem.appendChild(help);
        input.addEventListener('input', (e) => validator(item, e, input, help, item.validator));
      }

      if (itemConfig.id) {
        elements[itemConfig.id] = elem;
        elem.id = itemConfig.id;
      }

      location?.appendChild(elem);

      continue;
    }

    if (!itemConfig.hide && itemConfig.text) {
      const elem = document.createElement('div');
      elem.className = 'font-medium';
      if (itemConfig.id) {
        elements[itemConfig.id] = elem;
        elem.id = itemConfig.id;
      }
      elem.innerHTML = itemConfig.text;
      elem.onclick = (e) => onClick(e, itemConfig);
      location?.appendChild(elem);
      continue;
    }

    if (!itemConfig.id && (!itemConfig?.label || itemConfig.hide)) {
      continue;
    }
    if (itemConfig.options) {
      const elem = dropDownButton({ target: location, button: itemConfig, stateChange });
      if (itemConfig.visible === false) elem.style.display = NONE;
      if (itemConfig.id) elements[itemConfig.id] = elem;
    } else if (isObject(itemConfig.selection)) {
      const {
        selection: { options, actions },
        actionPlacement,
        threshold = 8,
        ...rest
      } = itemConfig;
      if (options?.length < threshold) {
        if (options.length) {
          if (actionPlacement === TOP) {
            options.unshift({ divider: true });
          } else {
            options.push({ divider: true });
          }
        }
        actions.forEach((action: any) => {
          const { label: text, ...attribs } = action;
          const option = { ...attribs, label: `<p style="font-weight: bold">${text}</p>` };
          if (actionPlacement === TOP) {
            options.unshift(option);
          } else {
            options.push(option);
          }
        });
        const buttonConfig = { ...rest, options };
        const elem = dropDownButton({ target: location, button: buttonConfig, stateChange });
        if (buttonConfig.visible === false) elem.style.display = NONE;
        if (buttonConfig.id) elements[itemConfig.id] = elem;
      } else {
        const elem = barButton(itemConfig);
        const selectFn = selectItemFn || selectItem;
        elem.onclick = (e) => {
          e.stopPropagation();
          selectFn({ title: itemConfig.selectionTitle || 'Select', options });
        };
        if (itemConfig.id) elements[itemConfig.id] = elem;
        location?.appendChild(elem);
      }
    } else if (itemConfig.tabs) {
      const elem = document.createElement('div');
      elem.className = 'tabs is-toggle is-toggle-rounded';
      const ul = document.createElement('ul');
      elem.appendChild(ul);
      itemConfig.tabs.forEach((tab: any) => {
        const li = document.createElement('li');
        if (tab.active) li.classList.add('is-active');
        const a = document.createElement('a');
        li.appendChild(a);
        a.onclick = (e) => {
          ul.querySelectorAll('li').forEach((li) => li.classList.remove('is-active'));
          li.classList.add('is-active');
          if (isFunction(tab.onClick)) tab.onClick(e, itemConfig);
        };
        const span = document.createElement('span');
        span.innerHTML = tab.label;
        a.appendChild(span);
        ul.appendChild(li);
      });
      if (itemConfig.id) elements[itemConfig.id] = elem;
      location.appendChild(elem);
    } else {
      const elem = barButton(itemConfig);
      elem.onclick = (e) => onClick(e, itemConfig);
      if (itemConfig.id) elements[itemConfig.id] = elem;
      location?.appendChild(elem);
    }

    if ((!(itemConfig?.label || itemConfig.tabs) || itemConfig.hide) && elements[itemConfig.id]) {
      elements[itemConfig.id].style.display = NONE;
    }
  }

  const panelHeader = target.getElementsByClassName('panelHeader')[0] as HTMLElement;
  if (panelHeader) panelHeader.style.display = headerCount ? EMPTY_STRING : NONE;

  table?.on('rowSelectionChanged', (_data: any, rows: any[]) => {
    if (isFunction(onSelection)) onSelection(rows);
    if (overlayCount) stateChange(rows);
  });

  stateChange();
  if (focus) setTimeout(() => focus.focus(), 200);

  return { elements, inputs };
}

function createControlElement(): { elements: Record<string, HTMLElement>; anchor: HTMLElement; header: HTMLElement } {
  const anchor = document.createElement('div');
  anchor.className = 'panel_container flexcol flexcenter';
  const header = document.createElement('div');
  header.className = 'panelHeader options_header';
  header.style.display = NONE;

  anchor.appendChild(header);

  const control = document.createElement('div');
  control.className = BUTTON_BAR;

  const elements: Record<string, HTMLElement> = {
    optionsOverlay: document.createElement('div'),
    optionsLeft: document.createElement('div'),
    optionsCenter: document.createElement('div'),
    optionsRight: document.createElement('div'),
  };
  elements.optionsOverlay.className = 'options_overlay';
  elements.optionsCenter.className = 'options_center';
  elements.optionsRight.className = 'options_right';
  elements.optionsLeft.className = 'options_left';

  for (const element of Object.values(elements)) {
    control.appendChild(element);
  }
  anchor.appendChild(control);

  return { elements, anchor, header };
}
