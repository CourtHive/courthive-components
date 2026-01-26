/**
 * Drawer component for side panels.
 * Supports left/right positioning, focus trap, and dynamic content/footer rendering.
 */
import * as focusTrap from 'focus-trap';
import './drawer.css';

const LEFT = 'left';
const RIGHT = 'right';
const DRAWER_ID = 'courthive-drawer';

// Utility: Check if value is a function
const isFunction = (value: any): boolean => typeof value === 'function';

// Utility: Remove all child nodes from an element
const removeAllChildNodes = (element: HTMLElement): void => {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

export interface DrawerOptions {
  title?: string;
  content?: string | ((elem: HTMLElement, close: () => void) => any);
  side?: 'left' | 'right';
  width?: string;
  footer?: string | ((elem: HTMLElement, close: () => void) => any);
  callback?: () => void;
  onClose?: () => boolean | void;
}

// Singleton instance
let drawerSingleton: any = null;
let listenersInitialized = false;

export const drawer = (): any => {
  // Return existing instance if already created
  if (drawerSingleton) {
    return drawerSingleton;
  }

  const settings = {
    selectorTrigger: '[data-drawer-trigger]',
    selectorTarget: '[data-drawer-target]',
    selectorClose: '[data-drawer-close]',
    leftAlignment: 'drawer--left',
    visibleClass: 'is-visible',
    activeClass: 'is-active',
    speedClose: 350,
    speedOpen: 50
  };

  const attributes: any = {};
  let drawerIsOpen = false;
  let cancelClose: any;
  let closeFx: (() => boolean | void) | undefined;

  const drawerId = DRAWER_ID;
  let trap: any;
  let isOpening = false; // Track if drawer is currently opening

  const setOnClose = (onClose: () => boolean | void) => (closeFx = onClose);

  const close = () => {
    isFunction(closeFx) && closeFx && closeFx() && (closeFx = undefined);
    const target = document.getElementById(drawerId);
    if (!target) return;
    target.classList.remove(settings.visibleClass);
    document.documentElement.style.overflow = '';
    setTimeout(function () {
      if (cancelClose) {
        target.classList.add(settings.visibleClass);
        document.documentElement.style.overflow = 'hidden';
        if (isFunction(cancelClose?.callback)) {
          cancelClose.callback();
        }
      } else {
        target.classList.remove(settings.activeClass);
        drawerIsOpen = false;
      }

      cancelClose = false;
      trap?.deactivate();
    }, settings.speedClose);
  };

  const openLeft = (callback?: () => void) => {
    if (!drawerId) return;
    const target = document.getElementById(drawerId);
    if (!target) return;
    if (!target.classList.contains(settings.leftAlignment)) target.classList.add(settings.leftAlignment);
    openDrawer(target, false, callback);
  };

  const openRight = (callback?: () => void) => {
    const target = document.getElementById(drawerId);
    if (!target) return;
    target.classList.remove(settings.leftAlignment);
    openDrawer(target, false, callback);
  };

  const setTitle = (title: string) => {
    const target = document.getElementById(drawerId);
    const titleElement = target?.querySelector('.drawer__title');
    if (titleElement) titleElement.innerHTML = title;
  };

  const setFooter = (footer?: string | ((elem: HTMLElement, close: () => void) => any)) => {
    const target = document.getElementById(drawerId);
    const footerElement = target?.querySelector('.drawer__footer') as HTMLElement;
    if (footerElement) {
      removeAllChildNodes(footerElement);
      if (isFunction(footer)) {
        attributes.footer = (footer as any)(footerElement, close);
      } else {
        footerElement.innerHTML = (footer as string) || '';
      }
    }
  };

  const setContent = (content: string | ((elem: HTMLElement, close: () => void) => any)) => {
    const target = document.getElementById(drawerId);
    const contentElement = target?.querySelector('.drawer__content') as HTMLElement;
    if (contentElement) {
      removeAllChildNodes(contentElement);
      if (isFunction(content)) {
        attributes.content = (content as any)(contentElement, close);
      } else {
        contentElement.innerHTML = content as string;
      }
    }
  };

  const setWidth = (width: string) => {
    const target = document.getElementById(drawerId);
    const wrapper = target?.querySelector('.drawer__wrapper') as HTMLElement;
    if (wrapper) wrapper.style.width = width;
  };

  const openDrawer = (target: HTMLElement, footer: boolean, callback?: () => void) => {
    drawerIsOpen = true;
    isOpening = true; // Set opening flag
    target.classList.add(settings.activeClass);
    document.documentElement.style.overflow = 'hidden';
    if (footer) {
      trap = focusTrap.createFocusTrap(target);
      trap.activate();
    }

    if (isFunction(callback) && callback) callback();

    setTimeout(function () {
      target.classList.add(settings.visibleClass);
      // Clear opening flag after animation completes
      setTimeout(() => {
        isOpening = false;
      }, 100);
    }, settings.speedOpen);
  };

  const open = (options: DrawerOptions = {}) => {
    const { title, content, side, width, footer, callback, onClose } = options;
    
    if (content) setContent(content);
    if (onClose) setOnClose(onClose);
    if (title) setTitle(title);
    if (width) setWidth(width);
    setFooter(footer);
    
    if (drawerIsOpen) {
      cancelClose = { callback };
    } else if (side) {
      if (side === RIGHT) return openRight(callback);
      if (side === LEFT) return openLeft(callback);
    } else {
      const target = document.getElementById(drawerId);
      if (target) openDrawer(target, footer as any, callback);
    }
  };

  const isDescendant = function (parent: HTMLElement, child: HTMLElement): boolean {
    let node = child.parentNode as HTMLElement;
    while (node) {
      if (node === parent) return true;
      node = node.parentNode as HTMLElement;
    }

    return false;
  };

  const clickHandler = function (pointerEvent: MouseEvent) {
    if (!drawerId || !drawerIsOpen || isOpening) return; // Don't handle clicks while opening
    const target = pointerEvent.target as HTMLElement;
    const parent = document.querySelector('.drawer__wrapper') as HTMLElement;
    if (!parent) return;
    
    // Check if click is on close button or its children (SVG, etc)
    const isCloseButton = target.classList.contains('drawer__close') || 
                          target.closest('.drawer__close') ||
                          target.hasAttribute('data-drawer-close') ||
                          target.closest('[data-drawer-close]');
    
    if (!isDescendant(parent, target) || isCloseButton) close();
  };

  const keydownHandler = (keyEvent: KeyboardEvent) => {
    if (keyEvent.key === 'Escape' && drawerIsOpen) close();
  };

  // Only add event listeners once
  if (!listenersInitialized) {
    document.addEventListener('click', clickHandler, false);
    document.addEventListener('keydown', keydownHandler, false);
    listenersInitialized = true;
  }

  drawerSingleton = { settings, open, close, setTitle, setContent, setFooter, attributes };
  return drawerSingleton;
};

/**
 * Initialize drawer HTML structure in the DOM
 */
export function initDrawer(): void {
  if (document.getElementById(DRAWER_ID)) return; // Already initialized

  const drawerHTML = `
    <div id="${DRAWER_ID}" class="drawer" aria-hidden="true">
      <div class="drawer__overlay" tabindex="-1" data-drawer-close></div>
      <div class="drawer__wrapper" role="dialog" aria-modal="true">
        <div class="drawer__header">
          <div class="drawer__title"></div>
          <button class="drawer__close" aria-label="Close drawer" data-drawer-close>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="drawer__content"></div>
        <div class="drawer__footer"></div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', drawerHTML);
}
