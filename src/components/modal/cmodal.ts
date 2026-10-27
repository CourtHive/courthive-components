import { anchorModalPopups } from './anchorModalPopups';
import { focusFirstControl } from './focusFirstControl';
import { getAttr } from '../../helpers/getAttr';
import {
  backdropStyle,
  bodyFreeze,
  modalContainerStyle,
  modalDialogStyle,
  modalFooterStyle,
  modalHeaderStyle,
  modalStyle,
  modalTitleStyle
} from './cmodalStyles';

// types
import type { ModalButton, ModalConfig, ModalParams } from '../../types';

const EMPTY = 'Nothing to see here';

/**
 * The header popovers (info, menu) close on a click outside them. That listener is attached 100 ms after
 * opening, so the opening click does not close the popover at once. Every pending or attached listener
 * is held here with a way to cancel it, so closing a popover, or the modal, never leaves a timer that
 * attaches a listener afterwards (the 6.4.1 publish run failed on exactly that timer).
 */
const popoverListeners = new Map<() => void, number>();

function listenForOutsideClick(listener: (event: MouseEvent) => void, owner: number): () => void {
  const timer = setTimeout(() => document.addEventListener('click', listener, true), 100);
  const cancel = () => {
    clearTimeout(timer);
    document.removeEventListener('click', listener, true);
    popoverListeners.delete(cancel);
  };
  popoverListeners.set(cancel, owner);
  return cancel;
}

type ModalContent = string | HTMLElement | ((container: HTMLElement) => any);

export function isFunction(fx: any): fx is (...args: any[]) => any {
  return typeof fx === 'function';
}
export function isString(item: any): item is string {
  return typeof item === 'string';
}
export function isArray(item: any): item is any[] {
  return Array.isArray(item);
}
export function isObject(item: any): item is object {
  return typeof item === 'object' && !Array.isArray(item);
}
export function removeAllChildNodes(parent: HTMLElement | null): void {
  if (!parent) return;

  while (parent.firstChild) {
    parent.firstChild.remove();
  }
}

export const cModal = (() => {
  const scrollStop = bodyFreeze();
  const defaultPadding = '1';
  let scrollPosition: number;
  let sequence = 0;
  const frames = new Map<
    number,
    { element: HTMLElement; content?: any; clickAway?: boolean; onClose?: (params: { content?: any }) => void }
  >();
  let modals: HTMLElement[] = [];
  let backdrop: HTMLElement;

  const closeBackdrop = (): void => {
    if (backdrop) {
      backdrop.style.opacity = '0';
      backdrop.style.display = 'none';
    }
  };

  const close = (conditional?: boolean, ownedId?: number, cascade = true): void => {
    const modalNumber = ownedId ?? Number(modals.at(-1)?.id.slice(5));
    const frame = frames.get(modalNumber);
    if (!frame || (conditional && frame.clickAway === false)) return;
    const index = modals.indexOf(frame.element);
    if (index < 0) return;
    const closing = cascade ? modals.slice(index).reverse() : [frame.element];
    const callbacks: Array<() => void> = [];
    // Detach the captured frames BEFORE invoking external callbacks. Reopened dialogs are new frames.
    for (const element of closing) {
      const id = Number(element.id.slice(5));
      const current = frames.get(id);
      frames.delete(id);
      modals = modals.filter((modal) => modal !== element);
      element.remove();
      if (current?.onClose) callbacks.push(() => current.onClose!({ content: current.content }));
    }
    const closingIds = new Set(closing.map((element) => element.id.slice(5)));
    for (const [cancel, owner] of [...popoverListeners]) if (closingIds.has(String(owner))) cancel();
    document.querySelectorAll<HTMLElement>('[data-modal-popover]').forEach((popover) => {
      if (closingIds.has(popover.dataset.modalOwner!)) popover.remove();
    });
    if (modals.length === 0) {
      document.body.classList.remove(scrollStop);
      document.body.style.top = null;
      globalThis.scrollTo({ top: scrollPosition, behavior: 'instant' });
      closeBackdrop();
    }
    let callbackError: unknown;
    for (const callback of callbacks) {
      try {
        callback();
      } catch (error) {
        callbackError ??= error;
      }
    }
    if (callbackError) throw callbackError;
  };

  const createBackdrop = (): void => {
    backdrop = document.createElement('div');
    backdrop.className = backdropStyle();
    backdrop.id = `cmdl-backdrop`;

    backdrop.onclick = () => close(true);

    document.body.appendChild(backdrop);
  };

  const freezeBackground = ({ config }: { config?: ModalConfig }): void => {
    // Capture scroll + freeze the body for the FIRST modal only. freezeBackground
    // runs before modals.push, so length 0 === first open. A nested open would
    // otherwise re-capture scrollY while the body is already position-fixed (≈0),
    // corrupting the scroll restore when the last modal finally closes.
    if (modals.length === 0) {
      scrollPosition = globalThis.scrollY;
      document.body.classList.add(scrollStop);
      document.body.style.top = `-${scrollPosition}px`;
    }

    if (!backdrop) createBackdrop();
    backdrop.style.display = '';
    if (config?.backdrop !== false) {
      backdrop.style.backgroundColor = 'var(--chc-bg-overlay)';
      backdrop.style.transition = 'opacity 0.15s linear';
      backdrop.style.opacity = '1';
    }
  };

  const getUnitValue = ({
    config,
    attr,
    attrs,
    unit = 'em',
    value
  }: {
    config?: any;
    attr?: string;
    attrs?: string[];
    unit?: string;
    value?: any;
  }): string => {
    let attrValue: any;

    if (isString(attr)) {
      attrValue = getAttr({ element: config, attr });
    } else if (isArray(attrs)) {
      attrValue = attrs.map((attr) => getAttr({ element: config, attr })).find(Boolean);
    }

    if (attrValue !== undefined) value = attrValue;
    if (Number.isNaN(value)) return value;

    // A value that already carries a CSS unit (e.g. '15px', '1.2rem') is returned
    // as-is; only bare numbers get the default unit appended. Without this the
    // fontSize default '15px' became '15pxem' — an invalid value the browser
    // drops, so modal body text inherited a large ancestor font.
    if (typeof value === 'string' && !/^-?\d*\.?\d+$/.test(value.trim())) return value;

    return `${value}${unit}`;
  };

  const footerButtons = ({
    buttons,
    config,
    modalNumber,
    registry
  }: {
    buttons: ModalButton[];
    config?: ModalConfig;
    modalNumber: number;
    registry?: Map<string, HTMLButtonElement>;
  }): HTMLElement => {
    registry?.clear();
    const modalFooter = document.createElement('div');
    modalFooter.className = modalFooterStyle();
    modalFooter.style.padding = getUnitValue({ config, attrs: ['footer.padding', 'padding'], value: defaultPadding });

    const defaultFooterButton: Partial<ModalButton> = {
      label: config?.dictionary?.close || 'Close',
      intent: 'is-info'
    };

    for (const button of buttons) {
      if (button.hide) continue;
      const buttonConfig: ModalButton = { ...defaultFooterButton, ...button };
      const elem = document.createElement('button');

      if (buttonConfig.disabled !== undefined) elem.disabled = buttonConfig.disabled;
      if (buttonConfig.id) {
        elem.id = buttonConfig.id;
        registry?.set(buttonConfig.id, elem);
      }

      elem.className = buttonConfig?.footer?.className || 'button font-medium';
      // Only add intent class if it's not 'none'
      if (buttonConfig.intent && buttonConfig.intent !== 'none') {
        elem.classList.add(buttonConfig.intent);
      }
      const baseStyle = 'margin-right: .5em;';
      const customStyle = (buttonConfig?.footer as any)?.style || '';
      elem.style.cssText = baseStyle + (customStyle ? ' ' + customStyle : '');
      elem.innerHTML = buttonConfig.label || buttonConfig.text || '';

      elem.onclick = (e) => {
        e.stopPropagation();
        if (isFunction(buttonConfig.onClick)) {
          buttonConfig.onClick({ e, content: frames.get(modalNumber)?.content });
        }
        if (buttonConfig.close !== false) {
          if (isFunction(buttonConfig.close)) buttonConfig.close();
          close(false, modalNumber, false);
        }
      };
      modalFooter.appendChild(elem);
    }
    return modalFooter;
  };

  const open = ({ title = '', content, buttons, footer, config, onClose }: ModalParams = {}) => {
    freezeBackground({ config });
    const modalNumber = ++sequence;
    const section = document.createElement('section');
    const id = `cmdl-${modalNumber}`;
    section.className = modalStyle();
    section.role = 'dialog';
    section.tabIndex = -1;
    section.id = id;
    const frame = { element: section, content: undefined as any, onClose, clickAway: config?.clickAway };
    frames.set(modalNumber, frame);

    const container = document.createElement('div');
    container.className = modalContainerStyle();
    container.style.maxWidth = `${config?.maxWidth || 450}px`;
    container.onclick = () => {
      if (modals.at(-1) === section) close(true, modalNumber);
    };

    const dialog = document.createElement('div');
    dialog.className = modalDialogStyle();
    dialog.style.color = 'var(--chc-text-primary)';

    // Apply custom class if provided
    if (config?.className) {
      dialog.classList.add(config.className);
    }

    // Apply custom styles if provided
    if (config?.style) {
      Object.assign(dialog.style, config.style);
    }

    dialog.onclick = (e) => e.stopPropagation();

    const modalHeader = document.createElement('div');
    const titleDiv = document.createElement('div');
    modalHeader.appendChild(titleDiv);

    // Header right container for info icon and menu caret
    const headerRight = document.createElement('div');
    headerRight.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0;';

    // Add info icon if config.info is present
    let infoIcon: HTMLElement | undefined;
    let infoPopover: HTMLElement | undefined;
    let cancelInfoListener: (() => void) | undefined;
    if (config?.info) {
      infoIcon = document.createElement('span');
      infoIcon.innerHTML = '?';
      infoIcon.style.cssText = `
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: var(--chc-container-link);
        color: var(--chc-on-link);
        font-size: 14px;
        font-weight: bold;
        line-height: 1;
        flex-shrink: 0;
        user-select: none;
      `;

      const closeInfoPopover = () => {
        cancelInfoListener?.();
        cancelInfoListener = undefined;
        if (infoPopover && document.body.contains(infoPopover)) {
          infoPopover.remove();
          infoPopover = undefined;
        }
      };

      infoIcon.onclick = (e) => {
        e.stopPropagation();

        // Close existing popover if open
        if (infoPopover && document.body.contains(infoPopover)) {
          closeInfoPopover();
          return;
        }

        // Do not render if info is undefined
        if (!config?.info) return;

        // Create popover
        infoPopover = document.createElement('div');
        infoPopover.dataset.modalPopover = 'true';
        infoPopover.dataset.modalOwner = String(modalNumber);
        infoPopover.style.cssText = `
          position: absolute;
          z-index: 10000;
          background-color: var(--chc-bg-elevated);
          border: 1px solid var(--chc-border-focus);
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          padding: 1em;
          max-width: 300px;
          font-size: 14px;
          font-weight: normal;
          line-height: 1.5;
          color: var(--chc-text-primary);
        `;

        // Close button (x)
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '\u00d7';
        closeBtn.style.cssText = `
          position: absolute;
          top: 4px;
          right: 8px;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          color: var(--chc-text-secondary);
        `;
        closeBtn.onclick = (ev) => {
          ev.stopPropagation();
          closeInfoPopover();
        };
        infoPopover.appendChild(closeBtn);

        // Ensure strong tags render correctly
        const style = document.createElement('style');
        style.textContent = `
          [data-modal-popover] strong {
            color: var(--chc-text-primary) !important;
            font-weight: 600;
          }
        `;
        if (!document.querySelector('[data-modal-popover-styles]')) {
          style.dataset.modalPopoverStyles = 'true';
          document.head.appendChild(style);
        }

        const contentEl = document.createElement('div');
        if (isString(config.info)) {
          contentEl.innerHTML = config.info;
        } else {
          contentEl.textContent = String(config.info);
        }
        infoPopover.appendChild(contentEl);

        document.body.appendChild(infoPopover);

        // Position the popover to the left of the info icon
        const rect = infoIcon.getBoundingClientRect();
        infoPopover.style.right = `${globalThis.innerWidth - rect.left + 5}px`;
        infoPopover.style.top = `${rect.bottom + 5}px`;
        infoPopover.style.left = 'auto';

        // Close on click anywhere else — use capture phase so dialog's stopPropagation doesn't block it
        const closePopover = (event: MouseEvent) => {
          if (infoPopover && !infoPopover.contains(event.target as Node) && event.target !== infoIcon) {
            closeInfoPopover();
          }
        };
        cancelInfoListener = listenForOutsideClick(closePopover, modalNumber);
      };

      headerRight.appendChild(infoIcon);
    }

    // Add menu caret if config.menu is present
    let menuDropdown: HTMLElement | undefined;
    let cancelMenuListener: (() => void) | undefined;
    const closeMenuDropdown = () => {
      cancelMenuListener?.();
      cancelMenuListener = undefined;
      menuDropdown?.remove();
      menuDropdown = undefined;
    };
    if (config?.menu?.menuItems?.length) {
      const menuCaret = document.createElement('span');
      menuCaret.className = 'chc-modal-menu-caret';
      menuCaret.innerHTML = '&#9662;'; // down-pointing triangle
      menuCaret.style.cssText = `
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        font-size: 14px;
        flex-shrink: 0;
        user-select: none;
        color: var(--chc-text-secondary);
        transition: background-color 0.15s;
      `;

      menuCaret.onmouseenter = () => {
        menuCaret.style.backgroundColor = 'var(--chc-hover-bg)';
      };
      menuCaret.onmouseleave = () => {
        menuCaret.style.backgroundColor = '';
      };

      menuCaret.onclick = (e) => {
        e.stopPropagation();

        // Toggle dropdown
        if (menuDropdown && document.body.contains(menuDropdown)) {
          closeMenuDropdown();
          return;
        }

        menuDropdown = document.createElement('div');
        menuDropdown.dataset.modalPopover = 'true';
        menuDropdown.dataset.modalOwner = String(modalNumber);
        menuDropdown.className = 'chc-modal-menu-dropdown';

        for (const item of config.menu.menuItems) {
          const menuItem = document.createElement('div');
          menuItem.className = 'chc-modal-menu-item' + (item.active ? ' chc-modal-menu-item--active' : '');
          menuItem.textContent = item.label;
          menuItem.onclick = (ev) => {
            ev.stopPropagation();
            closeMenuDropdown();
            item.onClick();
          };
          menuDropdown.appendChild(menuItem);
        }

        document.body.appendChild(menuDropdown);

        // Position below the caret
        const rect = menuCaret.getBoundingClientRect();
        menuDropdown.style.top = `${rect.bottom + 4}px`;
        menuDropdown.style.right = `${globalThis.innerWidth - rect.right}px`;

        // Close on click elsewhere — use capture phase so dialog's stopPropagation doesn't block it
        const closeMenu = (event: MouseEvent) => {
          if (menuDropdown && !menuDropdown.contains(event.target as Node) && event.target !== menuCaret) {
            closeMenuDropdown();
          }
        };
        cancelMenuListener = listenForOutsideClick(closeMenu, modalNumber);
      };

      headerRight.appendChild(menuCaret);
    }

    if (config?.info || config?.menu?.menuItems?.length) {
      modalHeader.appendChild(headerRight);
    }

    dialog.appendChild(modalHeader);

    const hasHeaderRight = config?.info || config?.menu?.menuItems?.length;
    const setTitle = ({ title, config }: { title?: string; config?: ModalConfig }) => {
      modalHeader.className = title ? modalHeaderStyle() : '';
      modalHeader.style.padding = getUnitValue({ config, attrs: ['title.padding', 'padding'], value: defaultPadding });
      modalHeader.style.display = title || hasHeaderRight ? 'flex' : '';
      modalHeader.style.alignItems = 'center';
      modalHeader.style.justifyContent = title ? 'space-between' : 'flex-end';
      titleDiv.className = title ? modalTitleStyle() : '';
      titleDiv.innerHTML = title;
    };
    if (title || hasHeaderRight) setTitle({ title, config });

    const modalBody = document.createElement('div');
    // Classed so the stylesheet can make it the dialog's one scrolling region; it was previously
    // styled only inline and therefore unreachable from CSS.
    modalBody.className = 'chc-modal-body';
    dialog.appendChild(modalBody);
    // Popups inside the body would be clipped by its scrolling; see anchorModalPopups.
    anchorModalPopups(modalBody);

    const attachContent = ({ content, config }: { content?: ModalContent; config?: ModalConfig }) => {
      modalBody.style.fontSize = getUnitValue({ config, attr: 'fontSize', value: '15px' });
      modalBody.style.position = 'relative';
      modalBody.style.padding = getUnitValue({ config, attrs: ['content.padding', 'padding'], value: defaultPadding });

      if (isFunction(content)) {
        frame.content = content(modalBody);
      } else if (content instanceof HTMLElement) {
        modalBody.appendChild(content);
      } else if (isString(content)) {
        modalBody.innerHTML = content;
      } else {
        modalBody.innerHTML = EMPTY;
      }
    };
    attachContent({ content, config });

    // Live references to the footer button elements cModal owns, keyed by id.
    // Lets callers flip a button's disabled state / label via setButtonState
    // without reaching into the footer DOM or rebuilding the whole footer.
    const buttonElements = new Map<string, HTMLButtonElement>();

    let footerElement: HTMLElement | undefined;
    if (isArray(buttons)) {
      footerElement = footerButtons({ buttons, config, modalNumber, registry: buttonElements });
      dialog.appendChild(footerElement);
    } else if (footer) {
      const modalFooter = document.createElement('div');
      modalFooter.className = modalFooterStyle();
      modalFooter.style.padding = getUnitValue({ config, attrs: ['footer.padding', 'padding'] });

      if (footer instanceof HTMLElement) {
        modalFooter.appendChild(footer);
      } else if (isString(footer)) {
        modalFooter.innerHTML = footer;
      } else {
        modalFooter.innerHTML = EMPTY;
      }

      footerElement = modalFooter;
      dialog.appendChild(modalFooter);
    }

    container.appendChild(dialog);
    section.appendChild(container);
    document.body.appendChild(section);
    // a frame on, once the modal is in the page; a form's own `focus: true` lands later still and stands
    if (config?.autoFocus !== false) requestAnimationFrame(() => focusFirstControl(modalBody));

    modals.push(section);

    const setContent = ({ content: newContent, config }: { content?: ModalContent; config?: ModalConfig }) => {
      frame.content = undefined;
      removeAllChildNodes(modalBody);
      attachContent({ content: newContent, config });
    };

    const setButtons = ({ buttons, config }: { buttons: ModalButton[]; config?: ModalConfig }) => {
      if (footerElement) footerElement.remove();
      footerElement = footerButtons({ buttons, config, modalNumber, registry: buttonElements });
      dialog.appendChild(footerElement);
    };

    // Update a single footer button in place — no DOM query by the caller and
    // no footer rebuild. Use this to gate a submit button as the user types.
    const setButtonState = (id: string, state: { disabled?: boolean; label?: string } = {}) => {
      const btn = buttonElements.get(id);
      if (!btn) return;
      if (state.disabled !== undefined) btn.disabled = state.disabled;
      if (state.label !== undefined) btn.innerHTML = state.label;
    };

    const setOnClose = ({ onClose }: { onClose?: (params: { content?: any }) => void }) => {
      frame.onClose = onClose;
    };

    const update = ({
      content: newContent,
      buttons,
      title,
      config: newConfig,
      onClose
    }: {
      content?: ModalContent;
      buttons?: ModalButton[];
      title?: string;
      config?: ModalConfig;
      onClose?: (params: { content?: any }) => void;
    }) => {
      config = newConfig || config;
      frame.clickAway = config?.clickAway;

      // Close any open info popover when config changes (content may be stale)
      if (infoPopover && document.body.contains(infoPopover)) {
        infoPopover.remove();
        infoPopover = undefined;
      }

      // Update info icon visibility based on new config
      if (infoIcon) {
        infoIcon.style.display = config?.info ? 'inline-flex' : 'none';
      }

      if (newContent) setContent({ content: newContent, config });
      if (buttons) setButtons({ buttons, config });
      if (onClose) setOnClose({ onClose });
      if (title) setTitle({ title, config });
    };

    return { setContent, setButtons, update, setButtonState, close: () => close(false, modalNumber) };
  };

  return { close, open };
})();
