/**
 * Create a control bar button with configuration.
 *
 * Creates a styled button element for use in control bars with support for intents,
 * tooltips, positioning, visibility, and disabled states.
 */
import tippy from 'tippy.js';

const NONE = 'none';

export function barButton(itemConfig: any): HTMLButtonElement {
  const elem = document.createElement('button');
  elem.className = 'button font-medium';
  if (itemConfig.disabled) elem.disabled = true;
  if (itemConfig.class) elem.classList.add(itemConfig.class);
  if (itemConfig.id) elem.id = itemConfig.id;

  // Spacing between buttons is handled by the container's gap property.
  // No individual margins needed.

  if (itemConfig.intent) elem.classList.add(itemConfig.intent);
  if (itemConfig.toolTip?.content) tippy(elem, itemConfig.toolTip);
  elem.innerHTML = itemConfig.label;

  if (itemConfig.visible === false) {
    elem.style.display = NONE;
  }

  return elem;
}
