/**
 * Wraps an `<input>` in a relative-positioned container with an absolutely
 * positioned (×) clear button that shows whenever the input has a value
 * and clears it on click.
 *
 * Visual is matched to the controlBar's built-in clear icon so search
 * fields look consistent across the platform.
 *
 * Returns the wrapping element. Callers append the wrapper (not the raw
 * input) into the toolbar. When the input value is set programmatically
 * (state sync, etc.) call `syncClearVisibility(wrap)` so the button
 * toggles correctly — the `input` event fires for user typing but not
 * for direct `.value =` assignments.
 */

const CLEAR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14" fill="currentColor">' +
  '<path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/>' +
  '</svg>';

// Associates the wrapper element with its sync function without
// monkey-patching the DOM type. Keys are weakly held so the entry
// disappears when the wrapper is GC'd.
const syncByWrap = new WeakMap<HTMLElement, () => void>();

export function wrapSearchWithClear(input: HTMLInputElement, onClear: () => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position: relative; flex: 1; display: flex; min-width: 0;';

  // Reserve space on the right for the clear icon so typed text doesn't
  // collide with it. 28px = ~14px icon + 8px right margin + 6px buffer.
  input.style.paddingRight = '28px';
  wrap.appendChild(input);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.setAttribute('aria-label', 'Clear search');
  clearBtn.style.cssText = [
    'position: absolute',
    'right: 8px',
    'top: 50%',
    'transform: translateY(-50%)',
    'background: transparent',
    'border: 0',
    'padding: 2px',
    'cursor: pointer',
    'display: none',
    'align-items: center',
    'justify-content: center',
    'line-height: 0',
    'opacity: 0.55',
    'color: currentColor',
  ].join('; ');
  clearBtn.innerHTML = CLEAR_SVG;
  clearBtn.addEventListener('mouseenter', () => (clearBtn.style.opacity = '0.9'));
  clearBtn.addEventListener('mouseleave', () => (clearBtn.style.opacity = '0.55'));
  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClear();
    sync();
  });

  const sync = () => {
    clearBtn.style.display = input.value ? 'inline-flex' : 'none';
  };

  // Escape also clears, mirroring controlBar's behaviour.
  input.addEventListener('keyup', (e) => {
    if (e.key === 'Escape' && input.value) {
      onClear();
      sync();
    }
  });

  input.addEventListener('input', sync);

  // Associate sync with the wrapper so callers can refresh visibility
  // after programmatic `input.value =` assignments (the native `input`
  // event doesn't fire for direct value writes).
  syncByWrap.set(wrap, sync);
  wrap.appendChild(clearBtn);
  return wrap;
}

export function syncClearVisibility(wrap: HTMLElement): void {
  syncByWrap.get(wrap)?.();
}
