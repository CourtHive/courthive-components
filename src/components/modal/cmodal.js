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

export const cModal = (() => {
  const scrollStop = bodyFreeze();
  const conditionalClose = {};
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
    document.body.classList.remove(scrollStop);
    document.body.style.top = null;
    window.scrollTo({
      top: scrollPosition,
      behavior: 'instant'
    });
    closeBackdrop();
    destroy();

    const onClose = closeFx.pop();
    if (typeof onClose === 'function') onClose();
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
    if (typeof attr !== 'string') return;
    const attrs = attr.split('.');
    for (const a of attrs) {
      node = node[a];
      if (!node) return;
    }
    return node;
  };

  const getUnitValue = ({ config, attr, attrs, unit = 'em', value }) => {
    if (typeof attr === 'string' && config[attr] !== undefined) {
      value = getConfigAttr({ config, attr });
    } else if (Array.isArray(attrs)) {
      value = attrs.map((attr) => getConfigAttr({ config, attr })).filter(Boolean)?.[0];
    }

    if (isNaN(value)) return value;
    return `${value}${unit}`;
  };

  const open = ({ title = '', content, footer, config, onClose } = {}) => {
    freezeBackground({ config });
    closeFx.push(onClose);

    const modalNumber = modals.length + 1;
    conditionalClose[modalNumber] = config?.clickAway;
    const section = document.createElement('section');
    const id = `cmdl-${modalNumber}`;
    section.className = modalStyle();
    section.role = 'dialog';
    section.tabIndex = -1;
    section.id = id;

    const container = document.createElement('div');
    container.className = modalContainerStyle();
    container.style.maxWidth = `${config.maxWidth || 450}px`;
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

    if (typeof content === 'function') {
      content(modalBody);
    } else if (typeof content === 'object') {
      modalBody.appendChild(content);
    } else if (typeof content === 'string') {
      modalBody.innerHTML = content;
    } else {
      modalBody.innerHTML = EMPTY;
    }
    dialog.appendChild(modalBody);

    if (footer) {
      const modalFooter = document.createElement('div');
      modalFooter.className = modalFooterStyle();
      modalFooter.style.padding = getUnitValue({ config, attrs: ['footer.padding', 'padding'] });
      if (typeof footer === 'object') {
        modalFooter.appendChild(footer);
      } else if (typeof footer === 'string') {
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
