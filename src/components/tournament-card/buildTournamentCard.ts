/**
 * Tournament Card — DOM Factory.
 *
 * Stateless function: TournamentCardData + TournamentCardConfig -> HTMLElement.
 * Mirrors the schedule-grid-cell pattern: zones rendered from config field arrays.
 */

import { mergeTournamentCardConfig } from './defaultConfig';
import { createCourtSvg } from '../courts/courtSvgUtil';
import {
  tcBodyStyle,
  tcCardClickableStyle,
  tcCardOfflineStyle,
  tcCardStyle,
  tcCornerBadgesStyle,
  tcDateRangeStyle,
  tcEventCountStyle,
  tcFeeBadgeStyle,
  tcFooterStyle,
  tcImageImgStyle,
  tcImagePlaceholderStyle,
  tcImageStyle,
  tcImageSvgStyle,
  tcLocationStyle,
  tcOfflineBadgeStyle,
  tcOrganizerStyle,
  tcPlayerCountStyle,
  tcStatusPillStyle,
  tcTitleStyle,
  tcUpdatedAtStyle
} from './styles';
import {
  TournamentCardCallbacks,
  TournamentCardConfig,
  TournamentCardCornerField,
  TournamentCardData,
  TournamentCardField
} from './types';

// ============================================================================
// Public Builder
// ============================================================================

export function buildTournamentCard(
  data: TournamentCardData,
  config?: Partial<TournamentCardConfig>,
  callbacks?: TournamentCardCallbacks
): HTMLElement {
  const cfg = mergeTournamentCardConfig(config);

  const card = document.createElement('div');
  card.className = tcCardStyle();
  card.dataset.tournamentId = data.tournamentId;

  if (data.offline) card.classList.add(tcCardOfflineStyle());

  if (callbacks?.onClick) {
    card.classList.add(tcCardClickableStyle());
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

function buildImageZone(data: TournamentCardData, cfg: TournamentCardConfig): HTMLElement {
  const image = document.createElement('div');
  image.className = tcImageStyle();

  if (data.tournamentImageURL) {
    const img = document.createElement('img');
    img.className = tcImageImgStyle();
    img.src = data.tournamentImageURL;
    img.alt = data.tournamentName || '';
    img.loading = 'lazy';
    img.addEventListener('error', () => replaceWithSvgOrPlaceholder(image, data));
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

function appendSvgOrPlaceholder(container: HTMLElement, data: TournamentCardData): void {
  const svg = createCourtSvg(data.courtSvgSport, tcImageSvgStyle());
  if (svg) {
    container.appendChild(svg);
    return;
  }
  const placeholder = document.createElement('div');
  placeholder.className = tcImagePlaceholderStyle();
  container.appendChild(placeholder);
}

function replaceWithSvgOrPlaceholder(container: HTMLElement, data: TournamentCardData): void {
  const img = container.querySelector(`.${tcImageImgStyle()}`);
  img?.remove();
  appendSvgOrPlaceholder(container, data);
}

// ============================================================================
// Corner Badges
// ============================================================================

function buildCornerBadges(data: TournamentCardData, fields: TournamentCardCornerField[]): HTMLElement | null {
  const badges: HTMLElement[] = [];
  for (const field of fields) {
    const el = renderCornerBadge(field, data);
    if (el) badges.push(el);
  }
  if (!badges.length) return null;

  const container = document.createElement('div');
  container.className = tcCornerBadgesStyle();
  for (const b of badges) container.appendChild(b);
  return container;
}

function renderCornerBadge(field: TournamentCardCornerField, data: TournamentCardData): HTMLElement | null {
  if (field === 'status') {
    if (!data.status) return null;
    const pill = document.createElement('div');
    pill.className = tcStatusPillStyle();
    pill.dataset.kind = data.status.kind;
    pill.textContent = data.status.label;
    return pill;
  }
  if (field === 'offline') {
    if (!data.offline) return null;
    const badge = document.createElement('div');
    badge.className = tcOfflineBadgeStyle();
    badge.textContent = 'Offline';
    return badge;
  }
  return null;
}

// ============================================================================
// Body Zone
// ============================================================================

function buildBodyZone(data: TournamentCardData, cfg: TournamentCardConfig): HTMLElement {
  const body = document.createElement('div');
  body.className = tcBodyStyle();
  for (const field of cfg.body) {
    const el = renderBodyField(field, data);
    if (el) body.appendChild(el);
  }
  return body;
}

function renderBodyField(field: TournamentCardField, data: TournamentCardData): HTMLElement | null {
  switch (field) {
    case 'title':
      return renderTitle(data);
    case 'location':
      return renderLocation(data);
    case 'dateRange':
      return renderDateRange(data);
    case 'organizerName':
      return renderOrganizer(data);
    case 'updatedAt':
      return renderUpdatedAt(data);
    default:
      return null;
  }
}

function renderTitle(data: TournamentCardData): HTMLElement | null {
  if (!data.tournamentName) return null;
  const el = document.createElement('div');
  el.className = tcTitleStyle();
  el.textContent = data.tournamentName;
  el.title = data.tournamentName;
  return el;
}

function renderLocation(data: TournamentCardData): HTMLElement | null {
  if (!data.location) return null;
  const el = document.createElement('div');
  el.className = tcLocationStyle();
  el.textContent = data.location;
  el.title = data.location;
  return el;
}

function renderDateRange(data: TournamentCardData): HTMLElement | null {
  if (!data.dateRangeFormatted) return null;
  const el = document.createElement('div');
  el.className = tcDateRangeStyle();
  el.textContent = data.dateRangeFormatted;
  return el;
}

function renderOrganizer(data: TournamentCardData): HTMLElement | null {
  if (!data.organizerName) return null;
  const el = document.createElement('div');
  el.className = tcOrganizerStyle();
  el.textContent = data.organizerName;
  return el;
}

function renderUpdatedAt(data: TournamentCardData): HTMLElement | null {
  if (!data.updatedAt) return null;
  const el = document.createElement('div');
  el.className = tcUpdatedAtStyle();
  const d = new Date(data.updatedAt);
  el.textContent = Number.isNaN(d.getTime())
    ? data.updatedAt
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return el;
}

// ============================================================================
// Footer Zone
// ============================================================================

function buildFooterZone(data: TournamentCardData, cfg: TournamentCardConfig): HTMLElement {
  const footer = document.createElement('div');
  footer.className = tcFooterStyle();
  for (const field of cfg.footer) {
    const el = renderFooterField(field, data);
    if (el) footer.appendChild(el);
  }
  return footer;
}

function renderFooterField(field: TournamentCardField, data: TournamentCardData): HTMLElement | null {
  switch (field) {
    case 'feeBadge':
      return renderFeeBadge(data);
    case 'playerCount':
      return renderPlayerCount(data);
    case 'eventCount':
      return renderEventCount(data);
    default:
      return null;
  }
}

function renderFeeBadge(data: TournamentCardData): HTMLElement | null {
  if (!data.feeFormatted) return null;
  const el = document.createElement('div');
  el.className = tcFeeBadgeStyle();
  el.textContent = data.feeFormatted;
  return el;
}

function renderPlayerCount(data: TournamentCardData): HTMLElement | null {
  if (typeof data.participantCount !== 'number') return null;
  const el = document.createElement('div');
  el.className = tcPlayerCountStyle();
  el.textContent = `${data.participantCount} ${data.participantCount === 1 ? 'player' : 'players'}`;
  return el;
}

function renderEventCount(data: TournamentCardData): HTMLElement | null {
  if (typeof data.eventCount !== 'number') return null;
  const el = document.createElement('div');
  el.className = tcEventCountStyle();
  el.textContent = `${data.eventCount} ${data.eventCount === 1 ? 'event' : 'events'}`;
  return el;
}
