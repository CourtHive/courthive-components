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

const EMPTY = 'Nothing to see here';

export function isFunction(fx) {
  return typeof fx === 'function';
}
export function isString(item) {
  return typeof item === 'string';
}
export function isArray(item) {
  return Array.isArray(item);
}
export function isObject(item) {
  return typeof item === 'object' && !Array.isArray(item);
}
export function removeAllChildNodes(parent) {
  if (!parent) return;

  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

export const cModal = (() => {
  const scrollStop = bodyFreeze();
  const conditionalClose = {};
  const defaultPadding = '.5';
  let bodyContent = [];
  let scrollPosition;
  let closeFx = [];
  let modals = [];
  let backdrop;

  const destroy = (id) => {
    if (!id) {
      const modal = modals.pop();
      if (modal) document.body.removeChild(modal);
    } else {
      let modal;
      modals = modals.filter((m) => {
        if (m.id === id) modal = m;
        return m.id !== id;
      });
      if (modal) document.body.removeChild(modal);
    }
  };

  const closeBackdrop = () => {
    if (backdrop) {
      backdrop.style.opacity = 0;
      backdrop.style.display = 'none';
    }
  };

  const close = (conditional) => {
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

  const createBackdrop = () => {
    backdrop = document.createElement('div');
    backdrop.className = backdropStyle();
    backdrop.id = `cmdl-backdrop`;

    backdrop.onclick = () => close(true);

    document.body.appendChild(backdrop);
  };

  const freezeBackground = ({ config }) => {
    scrollPosition = window.scrollY;
    document.body.classList.add(scrollStop);
    document.body.style.top = `-${scrollPosition}px`;

    if (!backdrop) createBackdrop();
    backdrop.style.display = '';
    if (config?.backdrop !== false) {
      backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
      backdrop.style.transition = 'opacity 0.15s linear';
      backdrop.style.opacity = 1;
    }
  };

  const getConfigAttr = ({ config: node, attr }) => {
    if (!isString(attr)) return;
    const attrs = attr.split('.');
    for (const a of attrs) {
      node = node?.[a];
      if (!node) return;
    }
    return node;
  };

  const getUnitValue = ({ config, attr, attrs, unit = 'em', value }) => {
    let attrValue;

    if (isString(attr)) {
      attrValue = getConfigAttr({ config, attr });
    } else if (isArray(attrs)) {
      attrValue = attrs.map((attr) => getConfigAttr({ config, attr })).filter(Boolean)?.[0];
    }

    if (attrValue !== undefined) value = attrValue;
    if (isNaN(value)) return value;

    return `${value}${unit}`;
  };

  const footerButtons = ({ buttons, config, modalNumber }) => {
    const modalFooter = document.createElement('div');
    modalFooter.className = modalFooterStyle();
    modalFooter.style.padding = getUnitValue({ config, attrs: ['footer.padding', 'padding'], value: defaultPadding });

    const defaultFooterButton = {
      label: config?.dictionary?.close || 'Close',
      onClick: cModal.close,
      intent: 'is-info'
    };

    for (const button of buttons) {
      if (button.hide) continue;
      const config = Object.assign({}, defaultFooterButton);
      if (isObject(button)) Object.assign(config, button);
      const elem = document.createElement('button');

      if (config.disabled !== undefined) elem.disabled = config.disabled;
      if (config.id) elem.id = config.id;

      elem.className = config?.footer?.className || 'button font-medium';
      elem.classList.add(config.intent);
      elem.style = 'margin-right: .5em;';
      elem.innerHTML = config.label || config.text;

      elem.onclick = (e) => {
        e.stopPropagation();
        if (isFunction(config.onClick)) config.onClick({ e, content: bodyContent[modalNumber] });
        if (config.close !== false) {
          if (isFunction(config.close)) config.close();
          cModal.close();
        }
      };
      modalFooter.appendChild(elem);
    }
    return modalFooter;
  };

  const open = ({ title = '', content, buttons, footer, config, onClose } = {}) => {
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

    const setTitle = ({ title, config }) => {
      modalHeader.className = title ? modalHeaderStyle() : '';
      modalHeader.style.padding = getUnitValue({ config, attrs: ['title.padding', 'padding'], value: defaultPadding });
      titleDiv.className = title ? modalTitleStyle() : '';
      titleDiv.innerHTML = title;
    };
    if (title) setTitle({ title });

    const modalBody = document.createElement('div');
    dialog.appendChild(modalBody);

    const attachContent = ({ content, config }) => {
      modalBody.style.fontSize = getUnitValue({ config, attr: 'fontSize', value: '15px' });
      modalBody.style.position = 'relative';
      modalBody.style.padding = getUnitValue({ config, attrs: ['content.padding', 'padding'], value: defaultPadding });

      if (isFunction(content)) {
        bodyContent[modalNumber] = content(modalBody);
      } else if (isObject(content)) {
        modalBody.appendChild(content);
      } else if (isString(content)) {
        modalBody.innerHTML = content;
      } else {
        modalBody.innerHTML = EMPTY;
      }
    };
    attachContent({ content, config });

    if (isArray(buttons)) {
      footer = footerButtons({ buttons, config, modalNumber });
      dialog.appendChild(footer);
    } else if (footer) {
      const modalFooter = document.createElement('div');
      modalFooter.className = modalFooterStyle();
      modalFooter.style.padding = getUnitValue({ config, attrs: ['footer.padding', 'padding'] });

      if (isObject(footer)) {
        modalFooter.appendChild(footer);
      } else if (isString(footer)) {
        modalFooter.innerHTML = footer;
      } else {
        modalFooter.innerHTML = EMPTY;
      }

      dialog.appendChild(modalFooter);
    }

    container.appendChild(dialog);
    section.appendChild(container);
    document.body.appendChild(section);

    modals.push(section);

    const setContent = ({ content: newContent, config }) => {
      bodyContent[modalNumber] = undefined;
      removeAllChildNodes(modalBody);
      attachContent({ content: newContent, config });
    };

    const setButtons = ({ buttons, config }) => {
      dialog.removeChild(footer);
      footer = footerButtons({ buttons, config, modalNumber });
      dialog.appendChild(footer);
    };

    const setOnClose = ({ onClose }) => {
      closeFx.length = 0; // clear array
      closeFx.push(onClose);
    };

    const update = ({ content: newContent, buttons, title, config: newConfig, onClose }) => {
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
