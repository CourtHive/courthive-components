/**
 * Time zone picker (CA, 2026-11-17): find a zone by what it is called rather than by its IANA id.
 *
 * A search box is the way in — city, zone name ("Eastern"), country, abbreviation or offset (`-5`, `UTC+5:30`) — over
 * a list that shows each zone's name, offset and time now. Beside it, a flat map of the world: hovering shades the
 * offset band under the pointer and names the nearest zone; a click chooses it. The map is an aid; the list is the
 * accessible path (combobox + listbox, arrow keys, Enter, Escape).
 *
 * The value is the IANA id, held in a hidden input (`picker.input`) so a form reads it like any other field.
 * The map and the zones' locations load on first use (`data/`), so a host that never shows a picker pays nothing.
 */
import { buildTimeZoneOptions, formatLocalTime, isValidTimeZone, nearestTimeZone } from './timeZoneModel';
import { searchTimeZones, timeZoneDisplay, runtimeTimeZones } from './timeZoneModel';
import './timezone-picker.css';

// constants and types
import type { TimeZoneOption, ZoneLocations } from './timeZoneModel';

export interface TimeZonePickerLabels {
  showMap?: string;
  hideMap?: string;
  noMatches?: string;
  /** Read out for the map, which is decorative to assistive technology. */
  mapLabel?: string;
}

export interface TimeZonePickerOptions {
  /** The IANA id to start with; empty for none. */
  value?: string;
  /** The zones to offer; the runtime's own by default. A valid `value` outside it is added. */
  timeZones?: string[];
  /** For zone, country and time names; the runtime's by default. */
  locale?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  /** Show the map when the picker renders (default true). The director can always toggle it. */
  showMap?: boolean;
  /** Clearing the box clears the value (default true); otherwise it restores the last zone. */
  allowEmpty?: boolean;
  labels?: TimeZonePickerLabels;
  onChange?: (timeZone: string) => void;
  /** The clock the offsets and local times are read at; for tests. */
  now?: () => Date;
}

export interface TimeZonePicker {
  element: HTMLDivElement;
  /** Hidden input holding the IANA id; it fires `input` and `change` when the zone changes. */
  input: HTMLInputElement;
  /** The visible search box. */
  search: HTMLInputElement;
  getValue(): string;
  setValue(timeZone: string): void;
  /** Resolves once the map and zone locations have loaded (or failed to). */
  ready: Promise<void>;
  destroy(): void;
}

interface MapData {
  width: number;
  height: number;
  land: string;
  bands: ReadonlyArray<{ offset: number; d: string }>;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const ACTIVE = 'is-active';
const HIDDEN = 'hidden';
const ARIA_EXPANDED = 'aria-expanded';
const ARIA_ACTIVE = 'aria-activedescendant';
const DEFAULT_LABELS: Required<TimeZonePickerLabels> = {
  showMap: 'Show map',
  hideMap: 'Hide map',
  noMatches: 'No matching time zone',
  mapLabel: 'World map of time zones'
};

let pickerCount = 0;

/** Map data and zone locations, imported once and shared. A failed import is forgotten so a later picker retries. */
let pendingData: Promise<{ map: MapData; zones: ZoneLocations }> | undefined;
function loadMapData(): Promise<{ map: MapData; zones: ZoneLocations }> {
  pendingData ??= Promise.all([import('./data/worldMap'), import('./data/zoneLocations')])
    .then(([world, located]) => ({
      map: { width: world.MAP_WIDTH, height: world.MAP_HEIGHT, land: world.LAND_PATH, bands: world.OFFSET_BANDS },
      zones: { locations: located.ZONE_LOCATIONS, aliases: located.ZONE_ALIASES }
    }))
    .catch((cause: unknown) => {
      pendingData = undefined;
      throw cause;
    });
  return pendingData;
}

function svg<T extends SVGElement = SVGElement>(tag: string, attributes: Record<string, string | number> = {}): T {
  const element = document.createElementNS(SVG_NS, tag) as T;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  return element;
}

function globeIcon(): SVGSVGElement {
  const icon = svg<SVGSVGElement>('svg', {
    viewBox: '0 0 24 24',
    width: 16,
    height: 16,
    'aria-hidden': 'true',
    focusable: 'false'
  });
  const stroke = { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6 };
  icon.append(
    svg('circle', { cx: 12, cy: 12, r: 9, ...stroke }),
    svg('ellipse', { cx: 12, cy: 12, rx: 4, ry: 9, ...stroke }),
    svg('path', { d: 'M3 12h18M5 7h14M5 17h14', ...stroke })
  );
  return icon;
}

export function createTimeZonePicker(options: TimeZonePickerOptions = {}): TimeZonePicker {
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const now = options.now ?? (() => new Date());
  const allowEmpty = options.allowEmpty ?? true;
  const uid = `chc-tz-${++pickerCount}`;
  let disposed = false;
  let zones: ZoneLocations | undefined;
  let value = isValidTimeZone(options.value) ? options.value.trim() : '';
  let zoneOptions: TimeZoneOption[] = [];
  let shown: TimeZoneOption[] = [];
  let query = '';
  let activeIndex = -1;

  const offered = () => {
    const list = options.timeZones?.length ? options.timeZones : runtimeTimeZones();
    return value && !list.includes(value) ? [...list, value] : list;
  };
  const rebuild = () => {
    zoneOptions = buildTimeZoneOptions({ timeZones: offered(), date: now(), locale: options.locale, zones });
  };
  const optionFor = (timeZone: string) => zoneOptions.find((option) => option.timeZone === timeZone);

  // ── elements ─────────────────────────────────────────────────────────
  const element = document.createElement('div');
  element.className = 'chc-tz-picker';

  const combo = document.createElement('div');
  combo.className = 'chc-tz-combo';

  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'input chc-tz-search';
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.placeholder = options.placeholder ?? '';
  search.setAttribute('role', 'combobox');
  search.setAttribute('aria-autocomplete', 'list');
  search.setAttribute(ARIA_EXPANDED, 'false');
  search.setAttribute('aria-controls', `${uid}-list`);
  if (options.id) search.id = options.id;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'chc-tz-map-toggle';
  toggle.append(globeIcon());

  const list = document.createElement('ul');
  list.className = 'chc-tz-list';
  list.id = `${uid}-list`;
  list.setAttribute('role', 'listbox');
  list.hidden = true;

  const mapBox = document.createElement('div');
  mapBox.className = 'chc-tz-map';
  const tooltip = document.createElement('div');
  tooltip.className = 'chc-tz-tooltip';
  tooltip.hidden = true;

  const input = document.createElement('input');
  input.type = HIDDEN;
  input.className = 'chc-tz-value';

  combo.append(search, toggle);
  element.append(combo, list, mapBox, input);

  if (options.disabled) {
    search.disabled = true;
    toggle.disabled = true;
  }

  // ── value ────────────────────────────────────────────────────────────
  const showValue = () => {
    const option = optionFor(value);
    search.value = option ? timeZoneDisplay(option) : value;
    input.value = value;
    highlightSelected();
  };

  const choose = (timeZone: string) => {
    const changed = timeZone !== value;
    value = timeZone;
    if (value && !optionFor(value)) rebuild();
    showValue();
    if (!changed) return;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    options.onChange?.(value);
  };

  // ── list ─────────────────────────────────────────────────────────────
  const isOpen = () => !list.hidden;

  const setActive = (index: number) => {
    const items = list.querySelectorAll<HTMLLIElement>('.chc-tz-option');
    items[activeIndex]?.classList.remove(ACTIVE);
    activeIndex = Math.max(-1, Math.min(index, shown.length - 1));
    const item = items[activeIndex];
    if (item) {
      item.classList.add(ACTIVE);
      search.setAttribute(ARIA_ACTIVE, item.id);
      item.scrollIntoView?.({ block: 'nearest' });
    } else search.removeAttribute(ARIA_ACTIVE);
  };

  const renderList = () => {
    shown = searchTimeZones(zoneOptions, query);
    const date = now();
    list.replaceChildren();
    if (!shown.length) {
      const empty = document.createElement('li');
      empty.className = 'chc-tz-empty';
      empty.textContent = labels.noMatches;
      list.append(empty);
    }
    shown.forEach((option, index) => {
      const item = document.createElement('li');
      item.className = 'chc-tz-option';
      item.id = `${uid}-option-${index}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option.timeZone === value));
      item.dataset.timeZone = option.timeZone;

      const main = document.createElement('span');
      main.className = 'chc-tz-option-main';
      const city = document.createElement('span');
      city.className = 'chc-tz-city';
      city.textContent = option.city;
      const meta = document.createElement('span');
      meta.className = 'chc-tz-meta';
      meta.textContent = [option.name, option.country].filter(Boolean).join(' · ');
      main.append(city, meta);

      const side = document.createElement('span');
      side.className = 'chc-tz-option-side';
      const offset = document.createElement('span');
      offset.className = 'chc-tz-offset';
      offset.textContent = option.offsetLabel;
      const time = document.createElement('span');
      time.className = 'chc-tz-time';
      time.textContent = formatLocalTime(option.timeZone, date, options.locale);
      side.append(offset, time);

      item.append(main, side);
      list.append(item);
    });
  };

  const open = (text = '') => {
    query = text;
    renderList();
    list.hidden = false;
    search.setAttribute(ARIA_EXPANDED, 'true');
    // a host that clips its content (a modal's scrolling body) places the list itself (`anchorModalPopups`)
    element.dispatchEvent(new CustomEvent('chc-tz-place', { bubbles: true }));
    const selected = query ? 0 : shown.findIndex((option) => option.timeZone === value);
    activeIndex = -1;
    setActive(selected);
  };

  const close = () => {
    list.hidden = true;
    search.setAttribute(ARIA_EXPANDED, 'false');
    search.removeAttribute(ARIA_ACTIVE);
    activeIndex = -1;
  };

  /** The box was left without a pick: an exact id or an emptied box counts; anything else puts the zone back. */
  const settle = () => {
    const text = search.value.trim();
    const exact = zoneOptions.find((option) => option.timeZone.toLowerCase() === text.toLowerCase());
    if (exact) choose(exact.timeZone);
    else if (!text && allowEmpty) choose('');
    else showValue();
  };

  search.addEventListener('focus', () => {
    search.select();
    open();
  });
  search.addEventListener('input', () => open(search.value));
  search.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen()) return open();
      setActive(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Enter') {
      if (!isOpen()) return;
      event.preventDefault();
      const option = shown[activeIndex];
      if (option) choose(option.timeZone);
      else settle();
      close();
    } else if (event.key === 'Escape' && isOpen()) {
      event.preventDefault();
      event.stopPropagation();
      showValue();
      close();
    } else if (event.key === 'Tab' && isOpen()) {
      const option = shown[activeIndex];
      if (option && search.value.trim() && search.value !== timeZoneDisplay(optionFor(value) ?? option)) {
        choose(option.timeZone);
      }
    }
  });
  // mousedown keeps focus in the box, so the click that follows is still a pick and not a blur
  list.addEventListener('mousedown', (event) => event.preventDefault());
  list.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest<HTMLLIElement>('.chc-tz-option');
    if (!item?.dataset.timeZone) return;
    choose(item.dataset.timeZone);
    close();
  });
  // the list belongs to the box: focus going anywhere else, the map toggle included, closes it
  search.addEventListener('blur', () => {
    if (isOpen()) {
      settle();
      close();
    }
  });

  // ── map ──────────────────────────────────────────────────────────────
  let mapSvg: SVGSVGElement | undefined;
  let bandPaths = new Map<number, SVGPathElement>();
  let hoverMarker: SVGCircleElement | undefined;
  let selectedMarker: SVGCircleElement | undefined;
  let hovered: TimeZoneOption | undefined;
  let mapShown = options.showMap ?? true;

  const setMapShown = (visible: boolean) => {
    mapShown = visible;
    mapBox.hidden = !visible;
    toggle.setAttribute('aria-pressed', String(visible));
    toggle.setAttribute('aria-label', visible ? labels.hideMap : labels.showMap);
    toggle.title = visible ? labels.hideMap : labels.showMap;
  };
  toggle.addEventListener('click', () => setMapShown(!mapShown));
  setMapShown(mapShown);

  const placeMarker = (marker: SVGCircleElement | undefined, option: TimeZoneOption | undefined) => {
    if (!marker) return;
    marker.style.display = option?.location ? '' : 'none';
    if (option?.location) {
      marker.setAttribute('cx', String(option.location[0]));
      marker.setAttribute('cy', String(option.location[1]));
    }
  };

  const shadeBand = (className: string, offsetMinutes: number | undefined) => {
    for (const [offset, path] of bandPaths) path.classList.toggle(className, offset * 60 === offsetMinutes);
  };

  function highlightSelected() {
    const option = optionFor(value);
    shadeBand('is-selected', option?.standardOffsetMinutes);
    placeMarker(selectedMarker, option);
  }

  const pointOnMap = (event: PointerEvent): [number, number] | undefined => {
    const matrix = mapSvg?.getScreenCTM();
    if (!mapSvg || !matrix) return undefined;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return [point.x, point.y];
  };

  const hover = (event: PointerEvent) => {
    const point = pointOnMap(event);
    if (!point) return;
    const band = (event.target as Element).closest?.('.chc-tz-band') as SVGPathElement | null;
    const bandOffsetMinutes = band?.dataset.offset === undefined ? undefined : Number(band.dataset.offset) * 60;
    hovered = nearestTimeZone(zoneOptions, point, { bandOffsetMinutes });
    shadeBand('is-hover', bandOffsetMinutes ?? hovered?.standardOffsetMinutes);
    placeMarker(hoverMarker, hovered);
    mapSvg!.style.cursor = hovered ? 'pointer' : '';
    if (!hovered) {
      tooltip.hidden = true;
      return;
    }
    tooltip.textContent = `${hovered.city} · ${hovered.offsetLabel} · ${formatLocalTime(hovered.timeZone, now(), options.locale)}`;
    tooltip.hidden = false;
    const box = mapBox.getBoundingClientRect();
    const left = event.clientX - box.left;
    tooltip.style.left = `${Math.min(Math.max(left, 0), box.width)}px`;
    tooltip.style.top = `${event.clientY - box.top}px`;
    tooltip.classList.toggle('is-flipped', left > box.width / 2);
  };

  const unhover = () => {
    hovered = undefined;
    tooltip.hidden = true;
    shadeBand('is-hover', undefined);
    placeMarker(hoverMarker, undefined);
  };

  const renderMap = (map: MapData) => {
    mapSvg = svg<SVGSVGElement>('svg', {
      viewBox: `0 0 ${map.width} ${map.height}`,
      class: 'chc-tz-map-svg',
      role: 'img',
      'aria-label': labels.mapLabel
    });
    const clipId = `${uid}-land`;
    const clip = svg('clipPath', { id: clipId });
    clip.append(svg('path', { d: map.land }));
    const defs = svg('defs');
    defs.append(clip);

    const bands = svg('g', { 'clip-path': `url(#${clipId})` });
    bandPaths = new Map();
    for (const { offset, d } of map.bands) {
      const path = svg<SVGPathElement>('path', { d, class: 'chc-tz-band' });
      path.dataset.offset = String(offset);
      // alternate whole-hour bands, as a printed time zone map does; part-hour bands stand out on their own
      path.classList.add(Number.isInteger(offset) ? (Math.abs(offset) % 2 ? 'is-odd' : 'is-even') : 'is-fraction');
      bandPaths.set(offset, path);
      bands.append(path);
    }

    const dots = svg('g', { class: 'chc-tz-dots' });
    for (const option of zoneOptions) {
      if (option.location) dots.append(svg('circle', { cx: option.location[0], cy: option.location[1], r: 0.9 }));
    }
    hoverMarker = svg<SVGCircleElement>('circle', { r: 2.4, class: 'chc-tz-marker is-hover' });
    selectedMarker = svg<SVGCircleElement>('circle', { r: 2.8, class: 'chc-tz-marker is-selected' });

    mapSvg.append(
      defs,
      svg('rect', { width: map.width, height: map.height, class: 'chc-tz-ocean' }),
      bands,
      svg('path', { d: map.land, class: 'chc-tz-land' }),
      dots,
      selectedMarker,
      hoverMarker
    );
    placeMarker(hoverMarker, undefined);
    mapSvg.addEventListener('pointermove', hover);
    mapSvg.addEventListener('pointerleave', unhover);
    mapSvg.addEventListener('click', () => {
      if (!hovered || options.disabled) return;
      choose(hovered.timeZone);
      close();
    });
    mapBox.replaceChildren(mapSvg, tooltip);
    highlightSelected();
  };

  // ── lifecycle ────────────────────────────────────────────────────────
  // forms rendered by renderForm are dropped, not destroyed: a picker gone from the page lets the document go
  const onDocumentPointer = (event: PointerEvent) => {
    if (!element.isConnected) return document.removeEventListener('pointerdown', onDocumentPointer);
    if (isOpen() && !element.contains(event.target as Node)) {
      settle();
      close();
    }
  };
  document.addEventListener('pointerdown', onDocumentPointer);

  rebuild();
  showValue();

  const ready = loadMapData()
    .then(({ map, zones: located }) => {
      if (disposed) return;
      zones = located;
      rebuild();
      showValue();
      if (isOpen()) renderList();
      renderMap(map);
    })
    .catch((cause: unknown) => {
      console.warn('[timezone-picker] map data failed to load; the search still works', cause);
      mapBox.hidden = true;
      toggle.hidden = true;
    });

  return {
    element,
    input,
    search,
    ready,
    getValue: () => value,
    setValue: (timeZone: string) => {
      value = isValidTimeZone(timeZone) ? timeZone.trim() : '';
      if (value && !optionFor(value)) rebuild();
      showValue();
    },
    destroy: () => {
      disposed = true;
      document.removeEventListener('pointerdown', onDocumentPointer);
      element.remove();
    }
  };
}
