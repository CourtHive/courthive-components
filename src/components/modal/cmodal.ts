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
import type { ModalButton, ModalConfig, ModalParams } from '../../types';

const EMPTY = 'Nothing to see here';

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
    parent.removeChild(parent.firstChild);
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
    if (!id) {
      const modal = modals.pop();
      if (modal) document.body.removeChild(modal);
    } else {
      let modal: HTMLElement | undefined;
      modals = modals.filter((m) => {
        if (m.id === id) modal = m;
        return m.id !== id;
      });
      if (modal) document.body.removeChild(modal);
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
      backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
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
    value?: any 
  }): string => {
    let attrValue: any;

    if (isString(attr)) {
      attrValue = getAttr({ element: config, attr });
    } else if (isArray(attrs)) {
      attrValue = attrs.map((attr) => getAttr({ element: config, attr })).filter(Boolean)?.[0];
    }

    if (attrValue !== undefined) value = attrValue;
    if (isNaN(value)) return value;

    return `${value}${unit}`;
  };

  const footerButtons = ({ buttons, config, modalNumber }: { buttons: ModalButton[]; config?: ModalConfig; modalNumber: number }): HTMLElement => {
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
      elem.classList.add(buttonConfig.intent || 'is-info');
      elem.style = 'margin-right: .5em;';
      elem.innerHTML = buttonConfig.label || buttonConfig.text || '';

      elem.onclick = (e) => {
        e.stopPropagation();
        if (isFunction(buttonConfig.onClick)) {
          // elem.classList.add('is-loading'); // disabled for now; issues in client
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
    dialog.onclick = (e) => e.stopPropagation();

    const modalHeader = document.createElement('div');
    const titleDiv = document.createElement('div');
    modalHeader.appendChild(titleDiv);
    dialog.appendChild(modalHeader);

    const setTitle = ({ title, config }: { title?: string; config?: ModalConfig }) => {
      modalHeader.className = title ? modalHeaderStyle() : '';
      modalHeader.style.padding = getUnitValue({ config, attrs: ['title.padding', 'padding'], value: defaultPadding });
      titleDiv.className = title ? modalTitleStyle() : '';
      titleDiv.innerHTML = title;
    };
    if (title) setTitle({ title });

    const modalBody = document.createElement('div');
    dialog.appendChild(modalBody);

    const attachContent = ({ content, config }: { content?: string | HTMLElement | ((container: HTMLElement) => any); config?: ModalConfig }) => {
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

    const setContent = ({ content: newContent, config }: { content?: string | HTMLElement | ((container: HTMLElement) => any); config?: ModalConfig }) => {
      bodyContent[modalNumber] = undefined;
      removeAllChildNodes(modalBody);
      attachContent({ content: newContent, config });
    };

    const setButtons = ({ buttons, config }: { buttons: ModalButton[]; config?: ModalConfig }) => {
      if (footerElement) dialog.removeChild(footerElement);
      footerElement = footerButtons({ buttons, config, modalNumber });
      dialog.appendChild(footerElement);
    };

    const setOnClose = ({ onClose }: { onClose?: (params: { content?: any }) => void }) => {
      closeFx.length = 0; // clear array
      closeFx.push(onClose);
    };

    const update = ({ content: newContent, buttons, title, config: newConfig, onClose }: { content?: string | HTMLElement | ((container: HTMLElement) => any); buttons?: ModalButton[]; title?: string; config?: ModalConfig; onClose?: (params: { content?: any }) => void }) => {
      config = newConfig || config;

      if (newContent) setContent({ content: newContent, config });
      if (buttons) setButtons({ buttons, config });
      if (onClose) setOnClose({ onClose });
      if (title) setTitle({ title, config });
    };

    return { setContent, setButtons, update };
  };

  return { close, open };
})();
