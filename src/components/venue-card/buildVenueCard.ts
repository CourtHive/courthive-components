/**
 * Venue Card — DOM Factory.
 *
 * Stateless function: VenueCardData + VenueCardConfig -> HTMLElement.
 * Image zone fallback chain (when zone enabled):
 *    venueImageURL  ->  OSM map iframe (when coords + showMap)  ->  court SVG  ->  placeholder
 */

import { mergeVenueCardConfig } from './defaultConfig';
import { createCourtSvg } from '../courts/courtSvgUtil';
import {
  vcAddressStyle,
  vcAmenityRowStyle,
  vcAmenityStyle,
  vcBodyStyle,
  vcCardClickableStyle,
  vcCardStyle,
  vcCornerBadgesStyle,
  vcCourtBreakdownStyle,
  vcFooterStyle,
  vcImageImgStyle,
  vcImageMapStyle,
  vcImagePlaceholderStyle,
  vcImageStyle,
  vcImageSvgStyle,
  vcPrimaryBadgeStyle,
  vcTitleStyle
} from './styles';
import {
  VenueCardCallbacks,
  VenueCardConfig,
  VenueCardCornerField,
  VenueCardData,
  VenueCardField
} from './types';

// ============================================================================
// Public Builder
// ============================================================================

export function buildVenueCard(
  data: VenueCardData,
  config?: Partial<VenueCardConfig>,
  callbacks?: VenueCardCallbacks
): HTMLElement {
  const cfg = mergeVenueCardConfig(config);

  const card = document.createElement('div');
  card.className = vcCardStyle();
  card.dataset.venueId = data.venueId;

  if (callbacks?.onClick) {
    card.classList.add(vcCardClickableStyle());
    card.tabIndex = 0;
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onClick!(data);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        callbacks.onClick!(data);
      }
    });
  }

  if (cfg.showImage !== false) card.appendChild(buildImageZone(data, cfg));
  if (cfg.body.length) card.appendChild(buildBodyZone(data, cfg));
  if (cfg.footer.length) card.appendChild(buildFooterZone(data, cfg));

  return card;
}

// ============================================================================
// Image Zone
// ============================================================================

function hasCoords(data: VenueCardData): boolean {
  return typeof data.latitude === 'number' && typeof data.longitude === 'number';
}

function buildOsmIframe(data: VenueCardData): HTMLIFrameElement {
  const lat = data.latitude as number;
  const lng = data.longitude as number;
  // ~1 km box around the point depending on latitude. Tight enough to give
  // context, loose enough to read.
  const offset = 0.01;
  const bbox = `${lng - offset},${lat - offset},${lng + offset},${lat + offset}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${lat},${lng}&layer=mapnik`;

  const iframe = document.createElement('iframe');
  iframe.className = vcImageMapStyle();
  iframe.src = src;
  iframe.loading = 'lazy';
  iframe.title = `Map of ${data.venueName}`;
  return iframe;
}

function appendSvgOrPlaceholder(container: HTMLElement, data: VenueCardData): void {
  const svg = createCourtSvg(data.courtSvgSport, vcImageSvgStyle());
  if (svg) {
    container.appendChild(svg);
    return;
  }
  const placeholder = document.createElement('div');
  placeholder.className = vcImagePlaceholderStyle();
  container.appendChild(placeholder);
}

function buildImageZone(data: VenueCardData, cfg: VenueCardConfig): HTMLElement {
  const image = document.createElement('div');
  image.className = vcImageStyle();

  if (data.venueImageURL) {
    const img = document.createElement('img');
    img.className = vcImageImgStyle();
    img.src = data.venueImageURL;
    img.alt = data.venueName || '';
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.remove();
      if (cfg.showMap !== false && hasCoords(data)) image.appendChild(buildOsmIframe(data));
      else appendSvgOrPlaceholder(image, data);
    });
    image.appendChild(img);
  } else if (cfg.showMap !== false && hasCoords(data)) {
    image.appendChild(buildOsmIframe(data));
  } else {
    appendSvgOrPlaceholder(image, data);
  }

  if (cfg.cornerBadges.length) {
    const badges = buildCornerBadges(data, cfg.cornerBadges);
    if (badges) image.appendChild(badges);
  }

  return image;
}

// ============================================================================
// Corner Badges
// ============================================================================

function renderCornerBadge(field: VenueCardCornerField, data: VenueCardData): HTMLElement | null {
  if (field === 'primaryBadge') {
    if (!data.isPrimary) return null;
    const badge = document.createElement('div');
    badge.className = vcPrimaryBadgeStyle();
    badge.textContent = 'Primary';
    return badge;
  }
  return null;
}

function buildCornerBadges(data: VenueCardData, fields: VenueCardCornerField[]): HTMLElement | null {
  const badges: HTMLElement[] = [];
  for (const f of fields) {
    const el = renderCornerBadge(f, data);
    if (el) badges.push(el);
  }
  if (!badges.length) return null;
  const container = document.createElement('div');
  container.className = vcCornerBadgesStyle();
  for (const b of badges) container.appendChild(b);
  return container;
}

// ============================================================================
// Body Zone
// ============================================================================

function renderTitle(data: VenueCardData): HTMLElement | null {
  if (!data.venueName) return null;
  const el = document.createElement('div');
  el.className = vcTitleStyle();
  el.textContent = data.venueName;
  el.title = data.notes ? `${data.venueName}\n${data.notes}` : data.venueName;
  return el;
}

function renderAddress(data: VenueCardData): HTMLElement | null {
  if (!data.addressFormatted) return null;
  const el = document.createElement('div');
  el.className = vcAddressStyle();
  el.textContent = data.addressFormatted;
  el.title = data.addressFormatted;
  return el;
}

function renderCourtBreakdown(data: VenueCardData): HTMLElement | null {
  if (!data.courtBreakdown) return null;
  const el = document.createElement('div');
  el.className = vcCourtBreakdownStyle();
  el.textContent = data.courtBreakdown;
  return el;
}

function renderAbbreviation(data: VenueCardData): HTMLElement | null {
  if (!data.venueAbbreviation) return null;
  const el = document.createElement('div');
  el.className = vcCourtBreakdownStyle();
  el.textContent = data.venueAbbreviation;
  return el;
}

function renderBodyField(field: VenueCardField, data: VenueCardData): HTMLElement | null {
  if (field === 'title') return renderTitle(data);
  if (field === 'address') return renderAddress(data);
  if (field === 'courtBreakdown') return renderCourtBreakdown(data);
  if (field === 'venueAbbreviation') return renderAbbreviation(data);
  return null;
}

function buildBodyZone(data: VenueCardData, cfg: VenueCardConfig): HTMLElement {
  const body = document.createElement('div');
  body.className = vcBodyStyle();
  for (const f of cfg.body) {
    const el = renderBodyField(f, data);
    if (el) body.appendChild(el);
  }
  return body;
}

// ============================================================================
// Footer Zone
// ============================================================================

function makeAmenity(label: string): HTMLElement {
  const el = document.createElement('span');
  el.className = vcAmenityStyle();
  el.textContent = label;
  return el;
}

function renderAmenityRow(data: VenueCardData): HTMLElement | null {
  const items: HTMLElement[] = [];
  if (typeof data.courtCount === 'number') {
    items.push(makeAmenity(`${data.courtCount} ${data.courtCount === 1 ? 'court' : 'courts'}`));
  }
  if (data.indoorCount) items.push(makeAmenity(`${data.indoorCount} indoor`));
  if (data.outdoorCount) items.push(makeAmenity(`${data.outdoorCount} outdoor`));
  if (data.floodlitCount) items.push(makeAmenity(`${data.floodlitCount} lit`));

  if (!items.length) return null;
  const row = document.createElement('div');
  row.className = vcAmenityRowStyle();
  for (const item of items) row.appendChild(item);
  return row;
}

function renderFooterField(field: VenueCardField, data: VenueCardData): HTMLElement | null {
  if (field === 'amenityRow') return renderAmenityRow(data);
  if (field === 'address') return renderAddress(data);
  if (field === 'courtBreakdown') return renderCourtBreakdown(data);
  return null;
}

function buildFooterZone(data: VenueCardData, cfg: VenueCardConfig): HTMLElement {
  const footer = document.createElement('div');
  footer.className = vcFooterStyle();
  for (const f of cfg.footer) {
    const el = renderFooterField(f, data);
    if (el) footer.appendChild(el);
  }
  return footer;
}
