/**
 * Segmented Bar — generic DOM factory.
 *
 * A configurable sibling of the competitiveness bar: given a list of segment
 * definitions (key + label + color), it returns an element plus an
 * `update(counts)` callback. Each non-zero segment renders as a flex-grow
 * band whose count appears centered. When `onSegmentClick` is supplied the
 * segments become clickable filter drivers and `setActive(key)` highlights
 * the selected segment (dimming the rest).
 *
 * The element is hidden (display:none) until the first update with total > 0.
 */

import './segmented-bar.css';

export interface SegmentDef {
  key: string;
  label: string;
  color: string; // any CSS color value, e.g. a var() reference
}

export interface BuildSegmentedBarOptions {
  segments: SegmentDef[];
  onSegmentClick?: (key: string) => void;
}

export interface BuildSegmentedBarResult {
  element: HTMLElement;
  update: (counts: Record<string, number>) => void;
  setActive: (key: string | null) => void;
}

export function buildSegmentedBar(options: BuildSegmentedBarOptions): BuildSegmentedBarResult {
  const { segments, onSegmentClick } = options;
  const element = document.createElement('div');
  element.className = 'chc-sb';

  const labelByKey: Record<string, string> = {};
  const segEls: Record<string, HTMLElement> = {};

  for (const { key, label, color } of segments) {
    labelByKey[key] = label;
    const seg = document.createElement('div');
    seg.className = 'chc-sb__seg';
    seg.dataset.key = key;
    seg.style.setProperty('--seg-bg', color);
    if (onSegmentClick) {
      seg.classList.add('is-clickable');
      seg.setAttribute('role', 'button');
      seg.addEventListener('click', () => onSegmentClick(key));
    }
    segEls[key] = seg;
    element.appendChild(seg);
  }

  const update = (counts: Record<string, number>): void => {
    const total = segments.reduce((sum, s) => sum + (counts[s.key] || 0), 0);
    element.style.display = total > 0 ? 'flex' : 'none';
    if (!total) return;

    for (const { key } of segments) {
      const seg = segEls[key];
      const count = counts[key] || 0;
      if (count === 0) {
        seg.style.flex = '0 0 0';
        seg.style.padding = '0';
        seg.textContent = '';
        seg.removeAttribute('title');
      } else {
        seg.style.flex = `${count} 1 0`;
        seg.style.padding = '0 4px';
        seg.textContent = String(count);
        seg.title = `${labelByKey[key]}: ${count}`;
      }
    }
  };

  const setActive = (key: string | null): void => {
    element.classList.toggle('has-active', !!key);
    for (const { key: segKey } of segments) {
      segEls[segKey].classList.toggle('is-active', segKey === key);
    }
  };

  return { element, update, setActive };
}
