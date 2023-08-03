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

  const closeModal = (conditional) => {
    if (conditional) {
      const modalNumber = modals.length;
      if (conditionalClose[modalNumber] === false) return;
    }
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

    backdrop.onclick = () => closeModal(true);

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

  const getPadding = ({ config, attr }) => {
    let padding;
    if (attr && config[attr] !== undefined) {
      padding = config[attr];
    }
    if (padding === undefined && config.padding !== undefined) {
      padding = config.padding;
    }

    if (isNaN(padding)) return padding;
    return `${padding}em`;
  };

  const newModal = ({ title = '', content, footer, config } = {}) => {
    const modalNumber = modals.length + 1;
    conditionalClose[modalNumber] = config?.clickAway;
    const section = document.createElement('section');
    const id = `cmdl-${modalNumber}`;
    section.className = modalStyle();
    section.role = 'dialog';
    section.tabIndex = -1;
    section.id = id;
    section.onclick = () => console.log('section');

    const container = document.createElement('div');
    container.className = modalContainerStyle();
    container.style.maxWidth = `${config.maxWidth || 450}px`;
    container.onclick = () => closeModal(true);

    const dialog = document.createElement('div');
    dialog.className = modalDialogStyle();
    dialog.onclick = (e) => e.stopPropagation();

    if (title) {
      const modalHeader = document.createElement('div');
      modalHeader.className = modalHeaderStyle();
      modalHeader.style.padding = getPadding({ config, attr: 'header' });
      const titleDiv = document.createElement('div');
      titleDiv.className = modalTitleStyle();
      titleDiv.innerHTML = title;

      modalHeader.appendChild(titleDiv);
      dialog.appendChild(modalHeader);
    }

    const modalBody = document.createElement('div');
    modalBody.style.position = 'relative';
    modalBody.style.padding = getPadding({ config, attr: 'body' });
    if (typeof content === 'object') {
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
      modalFooter.style.padding = getPadding({ config, attr: 'footer' });
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

  return {
    close: closeModal,
    open: ({ title, content, footer, config }) => {
      freezeBackground({ config });

      return newModal({ title, content, footer, config });
    }
  };
})();
