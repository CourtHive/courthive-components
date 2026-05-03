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
  const conditionalClose: Record<number, boolean | undefined> = {};
  const defaultPadding = '.5';
  const bodyContent: any[] = [];
  let scrollPosition: number;
  const closeFx: Array<((params: { content?: any }) => void) | undefined> = [];
  let modals: HTMLElement[] = [];
  let backdrop: HTMLElement;

  const destroy = (id?: string): void => {
    if (id) {
      let modal: HTMLElement | undefined;
      modals = modals.filter((m) => {
        if (m.id === id) modal = m;
        return m.id !== id;
      });
      if (modal) modal.remove();
    } else {
      const modal = modals.pop();
      if (modal) modal.remove();
    }
  };

  const closeBackdrop = (): void => {
    if (backdrop) {
      backdrop.style.opacity = '0';
      backdrop.style.display = 'none';
    }
  };

  const close = (conditional?: boolean): void => {
    const modalNumber = modals.length;
    if (conditional && conditionalClose[modalNumber] === false) {
      return;
    }

    const onClose = closeFx.pop();
    const content = bodyContent.pop();
    if (isFunction(onClose)) onClose({ content });

    // Clean up any open popovers
    const popovers = document.querySelectorAll('[data-modal-popover]');
    popovers.forEach((popover) => popover.remove());

    document.body.classList.remove(scrollStop);
    document.body.style.top = null;
    window.scrollTo({
      top: scrollPosition,
      behavior: 'instant'
    });
    closeBackdrop();
    destroy();
  };

  const createBackdrop = (): void => {
    backdrop = document.createElement('div');
    backdrop.className = backdropStyle();
    backdrop.id = `cmdl-backdrop`;

    backdrop.onclick = () => close(true);

    document.body.appendChild(backdrop);
  };

  const freezeBackground = ({ config }: { config?: ModalConfig }): void => {
    scrollPosition = window.scrollY;
    document.body.classList.add(scrollStop);
    document.body.style.top = `-${scrollPosition}px`;

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

    return `${value}${unit}`;
  };

  const footerButtons = ({
    buttons,
    config,
    modalNumber
  }: {
    buttons: ModalButton[];
    config?: ModalConfig;
    modalNumber: number;
  }): HTMLElement => {
    const modalFooter = document.createElement('div');
    modalFooter.className = modalFooterStyle();
    modalFooter.style.padding = getUnitValue({ config, attrs: ['footer.padding', 'padding'], value: defaultPadding });

    const defaultFooterButton: Partial<ModalButton> = {
      label: config?.dictionary?.close || 'Close',
      onClick: () => cModal.close(),
      intent: 'is-info'
    };

    for (const button of buttons) {
      if (button.hide) continue;
      const buttonConfig: ModalButton = { ...defaultFooterButton, ...button };
      const elem = document.createElement('button');

      if (buttonConfig.disabled !== undefined) elem.disabled = buttonConfig.disabled;
      if (buttonConfig.id) elem.id = buttonConfig.id;

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
          buttonConfig.onClick({ e, content: bodyContent[modalNumber] });
        }
        if (buttonConfig.close !== false) {
          if (isFunction(buttonConfig.close)) buttonConfig.close();
          cModal.close();
        }
      };
      modalFooter.appendChild(elem);
    }
    return modalFooter;
  };

  const open = ({ title = '', content, buttons, footer, config, onClose }: ModalParams = {}) => {
    freezeBackground({ config });
    closeFx.push(onClose);

    const modalNumber = modals.length + 1; // because the modal hasn't been added yet
    conditionalClose[modalNumber] = config?.clickAway;
    const section = document.createElement('section');
    const id = `cmdl-${modalNumber}`;
    section.className = modalStyle();
    section.role = 'dialog';
    section.tabIndex = -1;
    section.id = id;

    const container = document.createElement('div');
    container.className = modalContainerStyle();
    container.style.maxWidth = `${config?.maxWidth || 450}px`;
    container.onclick = () => close(true);

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
        background-color: #3273dc;
        color: white;
        font-size: 14px;
        font-weight: bold;
        line-height: 1;
        flex-shrink: 0;
        user-select: none;
      `;

      const closeInfoPopover = () => {
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
        infoPopover.style.cssText = `
          position: absolute;
          z-index: 10000;
          background-color: var(--chc-bg-elevated);
          border: 1px solid var(--chc-border-focus, #5b9bd5);
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
          color: var(--chc-text-secondary, #666);
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
        infoPopover.style.right = `${window.innerWidth - rect.left + 5}px`;
        infoPopover.style.top = `${rect.bottom + 5}px`;
        infoPopover.style.left = 'auto';

        // Close on click anywhere else — use capture phase so dialog's stopPropagation doesn't block it
        setTimeout(() => {
          const closePopover = (event: MouseEvent) => {
            if (infoPopover && !infoPopover.contains(event.target as Node) && event.target !== infoIcon) {
              closeInfoPopover();
              document.removeEventListener('click', closePopover, true);
            }
          };
          document.addEventListener('click', closePopover, true);
        }, 100);
      };

      headerRight.appendChild(infoIcon);
    }

    // Add menu caret if config.menu is present
    let menuDropdown: HTMLElement | undefined;
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
        color: var(--chc-text-secondary, #666);
        transition: background-color 0.15s;
      `;

      menuCaret.onmouseenter = () => {
        menuCaret.style.backgroundColor = 'var(--chc-hover-bg, #f0f0f0)';
      };
      menuCaret.onmouseleave = () => {
        menuCaret.style.backgroundColor = '';
      };

      menuCaret.onclick = (e) => {
        e.stopPropagation();

        // Toggle dropdown
        if (menuDropdown && document.body.contains(menuDropdown)) {
          menuDropdown.remove();
          menuDropdown = undefined;
          return;
        }

        menuDropdown = document.createElement('div');
        menuDropdown.dataset.modalPopover = 'true';
        menuDropdown.className = 'chc-modal-menu-dropdown';

        for (const item of config.menu.menuItems) {
          const menuItem = document.createElement('div');
          menuItem.className = 'chc-modal-menu-item' + (item.active ? ' chc-modal-menu-item--active' : '');
          menuItem.textContent = item.label;
          menuItem.onclick = (ev) => {
            ev.stopPropagation();
            menuDropdown?.remove();
            menuDropdown = undefined;
            item.onClick();
          };
          menuDropdown.appendChild(menuItem);
        }

        document.body.appendChild(menuDropdown);

        // Position below the caret
        const rect = menuCaret.getBoundingClientRect();
        menuDropdown.style.top = `${rect.bottom + 4}px`;
        menuDropdown.style.right = `${window.innerWidth - rect.right}px`;

        // Close on click elsewhere — use capture phase so dialog's stopPropagation doesn't block it
        setTimeout(() => {
          const closeMenu = (event: MouseEvent) => {
            if (menuDropdown && !menuDropdown.contains(event.target as Node) && event.target !== menuCaret) {
              menuDropdown.remove();
              menuDropdown = undefined;
              document.removeEventListener('click', closeMenu, true);
            }
          };
          document.addEventListener('click', closeMenu, true);
        }, 100);
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
    dialog.appendChild(modalBody);

    const attachContent = ({ content, config }: { content?: ModalContent; config?: ModalConfig }) => {
      modalBody.style.fontSize = getUnitValue({ config, attr: 'fontSize', value: '15px' });
      modalBody.style.position = 'relative';
      modalBody.style.padding = getUnitValue({ config, attrs: ['content.padding', 'padding'], value: defaultPadding });

      if (isFunction(content)) {
        bodyContent[modalNumber] = content(modalBody);
      } else if (content instanceof HTMLElement) {
        modalBody.appendChild(content);
      } else if (isString(content)) {
        modalBody.innerHTML = content;
      } else {
        modalBody.innerHTML = EMPTY;
      }
    };
    attachContent({ content, config });

    let footerElement: HTMLElement | undefined;
    if (isArray(buttons)) {
      footerElement = footerButtons({ buttons, config, modalNumber });
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

    modals.push(section);

    const setContent = ({ content: newContent, config }: { content?: ModalContent; config?: ModalConfig }) => {
      bodyContent[modalNumber] = undefined;
      removeAllChildNodes(modalBody);
      attachContent({ content: newContent, config });
    };

    const setButtons = ({ buttons, config }: { buttons: ModalButton[]; config?: ModalConfig }) => {
      if (footerElement) footerElement.remove();
      footerElement = footerButtons({ buttons, config, modalNumber });
      dialog.appendChild(footerElement);
    };

    const setOnClose = ({ onClose }: { onClose?: (params: { content?: any }) => void }) => {
      closeFx.length = 0; // clear array
      closeFx.push(onClose);
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

    return { setContent, setButtons, update };
  };

  return { close, open };
})();
