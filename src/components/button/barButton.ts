/**
 * Create a control bar button with configuration.
 *
 * Creates a styled button element for use in control bars with support for intents,
 * tooltips, positioning, visibility, and disabled states.
 */
import tippy from 'tippy.js';

const NONE = 'none';
const RIGHT = 'right';

export function barButton(itemConfig: any): HTMLButtonElement {
  const elem = document.createElement('button');
  elem.className = 'button font-medium';
  if (itemConfig.disabled) elem.disabled = true;
  if (itemConfig.class) elem.classList.add(itemConfig.class);
  if (itemConfig.id) elem.id = itemConfig.id;

  if (itemConfig.location === RIGHT) {
    elem.style.marginLeft = '1em';
  } else {
    elem.style.marginRight = '1em';
  }

  if (itemConfig.intent) elem.classList.add(itemConfig.intent);
  if (itemConfig.toolTip?.content) tippy(elem, itemConfig.toolTip);
  elem.innerHTML = itemConfig.label;

  if (itemConfig.visible === false) {
    elem.style.display = NONE;
  }

  return elem;
}
