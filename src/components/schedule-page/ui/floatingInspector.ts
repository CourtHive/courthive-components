import type { InspectorGeometry } from '../types';

const ARIA_LABEL = 'aria-label';
const ARROW_DIRECTIONS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1]
};

export function clampInspectorGeometry(
  value: Partial<InspectorGeometry>,
  width: number,
  height: number
): InspectorGeometry {
  const finite = (n: number | undefined, fallback: number) => (Number.isFinite(n) ? n! : fallback);
  const w = Math.min(Math.max(280, finite(value.width, 340)), Math.max(1, width - 16));
  const h = Math.min(Math.max(180, finite(value.height, 380)), Math.max(1, height - 16));
  return {
    width: w,
    height: h,
    left: Math.max(8, Math.min(finite(value.left, width - w - 24), width - w - 8)),
    top: Math.max(8, Math.min(finite(value.top, 100), height - h - 8))
  };
}

interface FloatingInspectorOptions {
  geometry?: InspectorGeometry;
  onGeometryChange?: (geometry: InspectorGeometry) => void;
  onClose: () => void;
  onDock: () => void;
}

/** A non-modal host. The caller owns selection, content, visibility and persistence. */
export function buildFloatingInspector(panel: HTMLElement, options: FloatingInspectorOptions) {
  const element = document.createElement('section');
  element.className = 'spl-floating-inspector';
  element.setAttribute('role', 'dialog');
  element.setAttribute(ARIA_LABEL, 'MatchUp inspector');
  element.hidden = true;
  const header = document.createElement('div');
  header.className = 'spl-floating-header';
  header.tabIndex = 0;
  header.setAttribute(ARIA_LABEL, 'Move inspector with arrow keys');
  const title = document.createElement('strong');
  title.textContent = 'Inspector';
  header.appendChild(title);
  let returnFocus: HTMLElement | null = null;
  function button(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', action);
    header.appendChild(button);
    return button;
  }
  button('Reset position', () => {
    geometry = clampInspectorGeometry({}, globalThis.innerWidth, globalThis.innerHeight);
    paint(true);
  });
  button('Dock', () => {
    options.onDock();
    returnFocus?.focus();
  });
  button('Close', () => {
    options.onClose();
    returnFocus?.focus();
  });
  const content = document.createElement('div');
  content.className = 'spl-floating-content';
  const resize = document.createElement('button');
  resize.type = 'button';
  resize.className = 'spl-floating-resize';
  resize.textContent = '↘';
  resize.setAttribute(ARIA_LABEL, 'Resize inspector with arrow keys');
  element.append(header, content, resize);
  let geometry = clampInspectorGeometry(options.geometry ?? {}, globalThis.innerWidth, globalThis.innerHeight);
  let drag: {
    id: number;
    x: number;
    y: number;
    geometry: InspectorGeometry;
    resizing: boolean;
    target: HTMLElement;
  } | null = null;
  function paint(persist = false): void {
    geometry = clampInspectorGeometry(geometry, globalThis.innerWidth, globalThis.innerHeight);
    Object.assign(element.style, {
      left: `${geometry.left}px`,
      top: `${geometry.top}px`,
      width: `${geometry.width}px`,
      height: `${geometry.height}px`
    });
    if (persist) options.onGeometryChange?.({ ...geometry });
  }
  function start(event: PointerEvent, resizing: boolean): void {
    if (event.button !== 0 || (!resizing && (event.target as HTMLElement).closest('button'))) return;
    const target = resizing ? resize : header;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, geometry: { ...geometry }, resizing, target };
    target.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function move(event: PointerEvent): void {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    geometry = drag.resizing
      ? { ...drag.geometry, width: drag.geometry.width + dx, height: drag.geometry.height + dy }
      : { ...drag.geometry, left: drag.geometry.left + dx, top: drag.geometry.top + dy };
    paint();
  }
  function stop(): void {
    if (!drag) return;
    const previous = drag;
    drag = null;
    if (previous.target.hasPointerCapture(previous.id)) previous.target.releasePointerCapture(previous.id);
    paint(true);
  }
  function key(event: KeyboardEvent, resizing: boolean): void {
    if (event.target !== event.currentTarget) return;
    const delta = event.shiftKey ? 40 : 10;
    const direction = ARROW_DIRECTIONS[event.key];
    if (!direction) return;
    const dx = direction[0] * delta;
    const dy = direction[1] * delta;
    event.preventDefault();
    geometry = resizing
      ? { ...geometry, width: geometry.width + dx, height: geometry.height + dy }
      : { ...geometry, left: geometry.left + dx, top: geometry.top + dy };
    paint(true);
  }
  header.addEventListener('pointerdown', (e) => start(e, false));
  resize.addEventListener('pointerdown', (e) => start(e, true));
  header.addEventListener('keydown', (e) => key(e, false));
  resize.addEventListener('keydown', (e) => key(e, true));
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', stop);
  element.addEventListener('pointercancel', stop);
  const onResize = () => paint(true);
  let listening = false;
  function setVisible(visible: boolean): void {
    element.hidden = !visible;
    if (visible && !listening) {
      globalThis.addEventListener('resize', onResize);
      paint();
    } else if (!visible && listening) globalThis.removeEventListener('resize', onResize);
    listening = visible;
  }
  paint();
  return {
    element,
    content,
    setVisible,
    rememberFocus: () => {
      if (!element.contains(document.activeElement)) returnFocus = document.activeElement as HTMLElement;
    },
    destroy: () => {
      stop();
      globalThis.removeEventListener('resize', onResize);
      element.remove();
      panel.remove();
    }
  };
}
