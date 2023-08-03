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

export const cModal = (() => {
  const scrollStop = bodyFreeze();
  const conditionalClose = {};
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
    if (isString(attr)) {
      value = getConfigAttr({ config, attr });
    } else if (isArray(attrs)) {
      value = attrs.map((attr) => getConfigAttr({ config, attr })).filter(Boolean)?.[0];
    }

    if (isNaN(value)) return value;
    return `${value}${unit}`;
  };

  const footerButtons = ({ buttons, config }) => {
    const modalFooter = document.createElement('div');
    modalFooter.className = modalFooterStyle();
    modalFooter.style.padding = getUnitValue({ config, attrs: ['footer.padding', 'padding'] });

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
        const modalNumber = modals.length;
        console.log({ bodyContent, modalNumber });
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

    if (title) {
      const modalHeader = document.createElement('div');
      modalHeader.className = modalHeaderStyle();
      modalHeader.style.padding = getUnitValue({ config, attrs: ['header.padding', 'padding'] });
      const titleDiv = document.createElement('div');
      titleDiv.className = modalTitleStyle();
      titleDiv.innerHTML = title;

      modalHeader.appendChild(titleDiv);
      dialog.appendChild(modalHeader);
    }

    const modalBody = document.createElement('div');
    modalBody.style.fontSize = getUnitValue({ config, attr: 'fontSize', value: '15px' });
    modalBody.style.position = 'relative';
    modalBody.style.padding = getUnitValue({ config, attrs: ['body.padding', 'padding'] });

    if (isFunction(content)) {
      bodyContent[modalNumber] = content(modalBody);
    } else if (isObject(content)) {
      modalBody.appendChild(content);
    } else if (isString(content)) {
      modalBody.innerHTML = content;
    } else {
      modalBody.innerHTML = EMPTY;
    }
    dialog.appendChild(modalBody);

    if (isArray(buttons)) {
      dialog.appendChild(footerButtons({ buttons, config }));
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

    return section;
  };

  return { close, open };
})();
