/**
 * Event Card — DOM Factory.
 */

import { mergeEventCardConfig } from './defaultConfig';
import { createCourtSvg } from '../courts/courtSvgUtil';
import {
  ecBodyStyle,
  ecCardClickableStyle,
  ecCardStyle,
  ecCategoryStyle,
  ecCornerBadgesStyle,
  ecDateRangeStyle,
  ecDrawSummaryStyle,
  ecEventTypeBadgeStyle,
  ecFooterStyle,
  ecGenderBadgeStyle,
  ecImageImgStyle,
  ecImagePlaceholderStyle,
  ecImageStyle,
  ecImageSvgStyle,
  ecPlayerCountStyle,
  ecProgressBarStyle,
  ecProgressFillStyle,
  ecProgressMetaStyle,
  ecProgressStyle,
  ecStatusPillStyle,
  ecTitleStyle,
  ecUpdatedAtStyle
} from './styles';
import {
  EventCardCallbacks,
  EventCardConfig,
  EventCardCornerField,
  EventCardData,
  EventCardField
} from './types';

// ============================================================================
// Public Builder
// ============================================================================

export function buildEventCard(
  data: EventCardData,
  config?: Partial<EventCardConfig>,
  callbacks?: EventCardCallbacks
): HTMLElement {
  const cfg = mergeEventCardConfig(config);

  const card = document.createElement('div');
  card.className = ecCardStyle();
  card.dataset.eventId = data.eventId;

  if (callbacks?.onClick) {
    card.classList.add(ecCardClickableStyle());
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

function appendSvgOrPlaceholder(container: HTMLElement, data: EventCardData): void {
  const svg = createCourtSvg(data.courtSvgSport, ecImageSvgStyle());
  if (svg) {
    container.appendChild(svg);
    return;
  }
  const placeholder = document.createElement('div');
  placeholder.className = ecImagePlaceholderStyle();
  container.appendChild(placeholder);
}

function buildImageZone(data: EventCardData, cfg: EventCardConfig): HTMLElement {
  const image = document.createElement('div');
  image.className = ecImageStyle();

  if (data.eventImageURL) {
    const img = document.createElement('img');
    img.className = ecImageImgStyle();
    img.src = data.eventImageURL;
    img.alt = data.eventName || '';
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.remove();
      appendSvgOrPlaceholder(image, data);
    });
    image.appendChild(img);
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

function renderStatusBadge(data: EventCardData): HTMLElement | null {
  if (!data.status) return null;
  const pill = document.createElement('div');
  pill.className = ecStatusPillStyle();
  pill.dataset.kind = data.status.kind;
  pill.textContent = data.status.label;
  return pill;
}

function renderEventTypeBadge(data: EventCardData): HTMLElement | null {
  if (!data.eventType) return null;
  const badge = document.createElement('div');
  badge.className = ecEventTypeBadgeStyle();
  badge.dataset.kind = data.eventType;
  badge.textContent = data.eventType;
  return badge;
}

function renderGenderBadge(data: EventCardData): HTMLElement | null {
  if (!data.gender) return null;
  const badge = document.createElement('div');
  badge.className = ecGenderBadgeStyle();
  badge.dataset.kind = data.gender;
  badge.textContent = data.gender === 'MALE' ? 'M' : data.gender === 'FEMALE' ? 'W' : 'X';
  return badge;
}

function renderCornerBadge(field: EventCardCornerField, data: EventCardData): HTMLElement | null {
  if (field === 'status') return renderStatusBadge(data);
  if (field === 'eventTypeBadge') return renderEventTypeBadge(data);
  if (field === 'genderBadge') return renderGenderBadge(data);
  return null;
}

function buildCornerBadges(data: EventCardData, fields: EventCardCornerField[]): HTMLElement | null {
  const badges: HTMLElement[] = [];
  for (const f of fields) {
    const el = renderCornerBadge(f, data);
    if (el) badges.push(el);
  }
  if (!badges.length) return null;
  const container = document.createElement('div');
  container.className = ecCornerBadgesStyle();
  for (const b of badges) container.appendChild(b);
  return container;
}

// ============================================================================
// Body Zone
// ============================================================================

function renderTitle(data: EventCardData): HTMLElement | null {
  if (!data.eventName) return null;
  const el = document.createElement('div');
  el.className = ecTitleStyle();
  el.textContent = data.eventName;
  el.title = data.eventName;
  return el;
}

function renderCategory(data: EventCardData): HTMLElement | null {
  if (!data.categoryLabel) return null;
  const el = document.createElement('div');
  el.className = ecCategoryStyle();
  el.textContent = data.categoryLabel;
  return el;
}

function renderDrawSummary(data: EventCardData): HTMLElement | null {
  if (!data.drawSummary) return null;
  const el = document.createElement('div');
  el.className = ecDrawSummaryStyle();
  el.textContent = data.drawSummary;
  return el;
}

function renderDateRange(data: EventCardData): HTMLElement | null {
  if (!data.dateRangeFormatted) return null;
  const el = document.createElement('div');
  el.className = ecDateRangeStyle();
  el.textContent = data.dateRangeFormatted;
  return el;
}

function renderUpdatedAt(data: EventCardData): HTMLElement | null {
  if (!data.updatedAt) return null;
  const el = document.createElement('div');
  el.className = ecUpdatedAtStyle();
  const d = new Date(data.updatedAt);
  el.textContent = Number.isNaN(d.getTime())
    ? data.updatedAt
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return el;
}

function renderPlayerCount(data: EventCardData): HTMLElement | null {
  if (typeof data.entryCount !== 'number') return null;
  const el = document.createElement('div');
  el.className = ecPlayerCountStyle();
  el.textContent = `${data.entryCount} ${data.entryCount === 1 ? 'player' : 'players'}`;
  return el;
}

function renderMatchUpProgress(data: EventCardData): HTMLElement | null {
  if (!data.matchUpCounts || data.matchUpCounts.total === 0) return null;
  const { total, completed } = data.matchUpCounts;
  const pct = Math.round((completed / total) * 100);

  const wrap = document.createElement('div');
  wrap.className = ecProgressStyle();

  const label = document.createElement('div');
  label.className = ecProgressMetaStyle();
  label.textContent = `${completed}/${total} matches · ${pct}%`;
  wrap.appendChild(label);

  const bar = document.createElement('div');
  bar.className = ecProgressBarStyle();
  const fill = document.createElement('div');
  fill.className = ecProgressFillStyle();
  fill.style.right = `${100 - pct}%`;
  bar.appendChild(fill);
  wrap.appendChild(bar);

  return wrap;
}

function renderBodyField(field: EventCardField, data: EventCardData): HTMLElement | null {
  if (field === 'title') return renderTitle(data);
  if (field === 'categoryLabel') return renderCategory(data);
  if (field === 'drawSummary') return renderDrawSummary(data);
  if (field === 'dateRange') return renderDateRange(data);
  if (field === 'updatedAt') return renderUpdatedAt(data);
  if (field === 'playerCount') return renderPlayerCount(data);
  if (field === 'matchUpProgress') return renderMatchUpProgress(data);
  return null;
}

function buildBodyZone(data: EventCardData, cfg: EventCardConfig): HTMLElement {
  const body = document.createElement('div');
  body.className = ecBodyStyle();
  for (const f of cfg.body) {
    const el = renderBodyField(f, data);
    if (el) body.appendChild(el);
  }
  return body;
}

function buildFooterZone(data: EventCardData, cfg: EventCardConfig): HTMLElement {
  const footer = document.createElement('div');
  footer.className = ecFooterStyle();
  for (const f of cfg.footer) {
    const el = renderBodyField(f, data);
    if (el) footer.appendChild(el);
  }
  return footer;
}
