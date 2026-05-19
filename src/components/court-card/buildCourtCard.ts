/**
 * Court Card — DOM Factory.
 */

import { mergeCourtCardConfig } from './defaultConfig';
import { createCourtSvg } from '../courts/courtSvgUtil';
import {
  ccAbbrStyle,
  ccAmenityRowStyle,
  ccAvailabilityStyle,
  ccBodyStyle,
  ccCardClickableStyle,
  ccCardStyle,
  ccCornerBadgesStyle,
  ccFloodlitBadgeStyle,
  ccFooterStyle,
  ccImagePlaceholderStyle,
  ccImageStyle,
  ccImageSvgStyle,
  ccIndoorBadgeStyle,
  ccSurfaceStyle,
  ccTitleStyle
} from './styles';
import {
  CourtCardCallbacks,
  CourtCardConfig,
  CourtCardCornerField,
  CourtCardData,
  CourtCardField
} from './types';

// ============================================================================
// Public Builder
// ============================================================================

export function buildCourtCard(
  data: CourtCardData,
  config?: Partial<CourtCardConfig>,
  callbacks?: CourtCardCallbacks
): HTMLElement {
  const cfg = mergeCourtCardConfig(config);

  const card = document.createElement('div');
  card.className = ccCardStyle();
  card.dataset.courtId = data.courtId;

  if (callbacks?.onClick) {
    card.classList.add(ccCardClickableStyle());
    card.tabIndex = 0;
    card.addEventListener('click', (e) => {
      // Stop here so consumer drawers/modals don't see this as a click-outside.
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

function appendSvgOrPlaceholder(container: HTMLElement, data: CourtCardData): void {
  const svg = createCourtSvg(data.courtSvgSport, ccImageSvgStyle());
  if (svg) {
    container.appendChild(svg);
    return;
  }
  const placeholder = document.createElement('div');
  placeholder.className = ccImagePlaceholderStyle();
  container.appendChild(placeholder);
}

function buildImageZone(data: CourtCardData, cfg: CourtCardConfig): HTMLElement {
  const image = document.createElement('div');
  image.className = ccImageStyle();
  if (data.surfaceCategory) image.dataset.surface = data.surfaceCategory;
  appendSvgOrPlaceholder(image, data);
  if (cfg.cornerBadges.length) {
    const badges = buildCornerBadges(data, cfg.cornerBadges);
    if (badges) image.appendChild(badges);
  }
  return image;
}

// ============================================================================
// Corner Badges
// ============================================================================

function renderIndoorBadge(data: CourtCardData): HTMLElement | null {
  if (!data.indoorOutdoor) return null;
  const badge = document.createElement('div');
  badge.className = ccIndoorBadgeStyle();
  badge.dataset.kind = data.indoorOutdoor;
  badge.textContent = data.indoorOutdoor === 'INDOOR' ? 'Indoor' : 'Outdoor';
  return badge;
}

function renderFloodlitBadge(data: CourtCardData): HTMLElement | null {
  if (!data.floodlit) return null;
  const badge = document.createElement('div');
  badge.className = ccFloodlitBadgeStyle();
  badge.textContent = 'Lit';
  return badge;
}

function renderCornerBadge(field: CourtCardCornerField, data: CourtCardData): HTMLElement | null {
  if (field === 'indoorOutdoor') return renderIndoorBadge(data);
  if (field === 'floodlit') return renderFloodlitBadge(data);
  return null;
}

function buildCornerBadges(data: CourtCardData, fields: CourtCardCornerField[]): HTMLElement | null {
  const badges: HTMLElement[] = [];
  for (const f of fields) {
    const el = renderCornerBadge(f, data);
    if (el) badges.push(el);
  }
  if (!badges.length) return null;
  const container = document.createElement('div');
  container.className = ccCornerBadgesStyle();
  for (const b of badges) container.appendChild(b);
  return container;
}

// ============================================================================
// Body Zone
// ============================================================================

function renderTitle(data: CourtCardData): HTMLElement | null {
  if (!data.courtName) return null;
  const el = document.createElement('div');
  el.className = ccTitleStyle();
  el.textContent = data.courtName;
  el.title = data.notes ? `${data.courtName}\n${data.notes}` : data.courtName;
  return el;
}

function renderSurface(data: CourtCardData): HTMLElement | null {
  if (!data.surfaceLabel) return null;
  const el = document.createElement('div');
  el.className = ccSurfaceStyle();
  el.textContent = data.surfaceLabel;
  return el;
}

function renderAvailability(data: CourtCardData): HTMLElement | null {
  if (!data.availabilitySummary) return null;
  const el = document.createElement('div');
  el.className = ccAvailabilityStyle();
  el.textContent = data.availabilitySummary;
  return el;
}

function renderAbbreviation(data: CourtCardData): HTMLElement | null {
  if (!data.courtAbbreviation) return null;
  const el = document.createElement('div');
  el.className = ccAbbrStyle();
  el.textContent = data.courtAbbreviation;
  return el;
}

function renderBodyField(field: CourtCardField, data: CourtCardData): HTMLElement | null {
  if (field === 'title') return renderTitle(data);
  if (field === 'surface') return renderSurface(data);
  if (field === 'availability') return renderAvailability(data);
  if (field === 'abbreviation') return renderAbbreviation(data);
  return null;
}

function buildBodyZone(data: CourtCardData, cfg: CourtCardConfig): HTMLElement {
  const body = document.createElement('div');
  body.className = ccBodyStyle();
  for (const f of cfg.body) {
    const el = renderBodyField(f, data);
    if (el) body.appendChild(el);
  }
  return body;
}

// ============================================================================
// Footer Zone
// ============================================================================

function renderAmenityRow(data: CourtCardData): HTMLElement | null {
  const items: string[] = [];
  if (data.indoorOutdoor) items.push(data.indoorOutdoor === 'INDOOR' ? 'indoor' : 'outdoor');
  if (data.surfaceCategory) items.push(data.surfaceCategory.toLowerCase());
  if (data.floodlit) items.push('floodlit');
  if (!items.length) return null;
  const row = document.createElement('div');
  row.className = ccAmenityRowStyle();
  row.textContent = items.join(' · ');
  return row;
}

function renderFooterField(field: CourtCardField, data: CourtCardData): HTMLElement | null {
  if (field === 'amenityRow') return renderAmenityRow(data);
  if (field === 'availability') return renderAvailability(data);
  if (field === 'surface') return renderSurface(data);
  return null;
}

function buildFooterZone(data: CourtCardData, cfg: CourtCardConfig): HTMLElement {
  const footer = document.createElement('div');
  footer.className = ccFooterStyle();
  for (const f of cfg.footer) {
    const el = renderFooterField(f, data);
    if (el) footer.appendChild(el);
  }
  return footer;
}
