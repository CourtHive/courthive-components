/**
 * Draw Card — DOM Factory.
 */

import { mergeDrawCardConfig } from './defaultConfig';
import {
  dcBodyStyle,
  dcCardClickableStyle,
  dcCardStyle,
  dcChipStyle,
  dcCornerBadgesStyle,
  dcDrawTypeLabelStyle,
  dcFooterStyle,
  dcMetaLineStyle,
  dcProgressBarStyle,
  dcProgressFillStyle,
  dcProgressStyle,
  dcSecondaryBadgeStyle,
  dcStatusPillStyle,
  dcTitleStyle
} from './styles';
import {
  DrawCardCallbacks,
  DrawCardConfig,
  DrawCardCornerField,
  DrawCardData,
  DrawCardField
} from './types';

export function buildDrawCard(
  data: DrawCardData,
  config?: Partial<DrawCardConfig>,
  callbacks?: DrawCardCallbacks
): HTMLElement {
  const cfg = mergeDrawCardConfig(config);

  const card = document.createElement('div');
  card.className = dcCardStyle();
  card.dataset.drawId = data.drawId;
  if (data.eventId) card.dataset.eventId = data.eventId;

  if (callbacks?.onClick) {
    card.classList.add(dcCardClickableStyle());
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

  if (cfg.cornerBadges.length) {
    const badges = buildCornerBadges(data, cfg.cornerBadges);
    if (badges) card.appendChild(badges);
  }
  if (cfg.body.length) card.appendChild(buildBodyZone(data, cfg));
  if (cfg.footer.length) card.appendChild(buildFooterZone(data, cfg));

  return card;
}

// ── Corner badges ────────────────────────────────────────────────────

function renderStatusBadge(data: DrawCardData): HTMLElement | null {
  if (!data.status) return null;
  const pill = document.createElement('div');
  pill.className = dcStatusPillStyle();
  pill.dataset.kind = data.status.kind;
  pill.textContent = data.status.label;
  return pill;
}

function renderPublishedBadge(data: DrawCardData): HTMLElement | null {
  if (!data.published) return null;
  const badge = document.createElement('div');
  badge.className = dcSecondaryBadgeStyle();
  badge.dataset.kind = 'published';
  badge.textContent = 'Published';
  return badge;
}

function renderEmbargoBadge(data: DrawCardData): HTMLElement | null {
  if (!data.embargoActive) return null;
  const badge = document.createElement('div');
  badge.className = dcSecondaryBadgeStyle();
  badge.dataset.kind = 'embargo';
  badge.textContent = 'Embargo';
  return badge;
}

function renderCornerBadge(field: DrawCardCornerField, data: DrawCardData): HTMLElement | null {
  if (field === 'status') return renderStatusBadge(data);
  if (field === 'publishedBadge') return renderPublishedBadge(data);
  if (field === 'embargoBadge') return renderEmbargoBadge(data);
  return null;
}

function buildCornerBadges(data: DrawCardData, fields: DrawCardCornerField[]): HTMLElement | null {
  const badges: HTMLElement[] = [];
  for (const f of fields) {
    const el = renderCornerBadge(f, data);
    if (el) badges.push(el);
  }
  if (!badges.length) return null;
  const container = document.createElement('div');
  container.className = dcCornerBadgesStyle();
  for (const b of badges) container.appendChild(b);
  return container;
}

// ── Body / footer fields ─────────────────────────────────────────────

function renderTitle(data: DrawCardData): HTMLElement | null {
  if (!data.drawName) return null;
  const el = document.createElement('div');
  el.className = dcTitleStyle();
  el.textContent = data.drawName;
  el.title = data.drawName;
  return el;
}

function renderDrawTypeLabel(data: DrawCardData): HTMLElement | null {
  if (!data.drawTypeLabel) return null;
  const el = document.createElement('div');
  el.className = dcDrawTypeLabelStyle();
  el.textContent = data.drawTypeLabel;
  return el;
}

function chip(text: string): HTMLElement {
  const el = document.createElement('span');
  el.className = dcChipStyle();
  el.textContent = text;
  return el;
}

function renderDrawSize(data: DrawCardData): HTMLElement | null {
  if (typeof data.drawSize !== 'number') return null;
  return chip(`Size ${data.drawSize}`);
}

function renderEntries(data: DrawCardData): HTMLElement | null {
  if (typeof data.entryCount !== 'number') return null;
  return chip(`${data.entryCount} ${data.entryCount === 1 ? 'entry' : 'entries'}`);
}

function renderMatchUpFormat(data: DrawCardData): HTMLElement | null {
  if (!data.matchUpFormat) return null;
  return chip(data.matchUpFormat);
}

function renderFlightNumber(data: DrawCardData): HTMLElement | null {
  if (typeof data.flightNumber !== 'number') return null;
  return chip(`Flight ${data.flightNumber}`);
}

function renderRatings(data: DrawCardData): HTMLElement | null {
  const parts: string[] = [];
  if (typeof data.utrAvg === 'number') parts.push(`UTR ${data.utrAvg.toFixed(2)}`);
  if (typeof data.wtnAvg === 'number') parts.push(`WTN ${data.wtnAvg.toFixed(2)}`);
  if (!parts.length) return null;
  const el = document.createElement('div');
  el.className = dcMetaLineStyle();
  el.textContent = parts.join(' · ');
  return el;
}

function renderMatchUpProgress(data: DrawCardData): HTMLElement | null {
  if (!data.matchUpCounts || data.matchUpCounts.total === 0) return null;
  const { total, completed } = data.matchUpCounts;
  const pct = Math.round((completed / total) * 100);

  const wrap = document.createElement('div');
  wrap.className = dcProgressStyle();

  const label = document.createElement('div');
  label.className = dcMetaLineStyle();
  label.textContent = `${completed}/${total} matches · ${pct}%`;
  wrap.appendChild(label);

  const bar = document.createElement('div');
  bar.className = dcProgressBarStyle();
  const fill = document.createElement('div');
  fill.className = dcProgressFillStyle();
  fill.style.right = `${100 - pct}%`;
  bar.appendChild(fill);
  wrap.appendChild(bar);

  return wrap;
}

function renderField(field: DrawCardField, data: DrawCardData): HTMLElement | null {
  if (field === 'title') return renderTitle(data);
  if (field === 'drawTypeLabel') return renderDrawTypeLabel(data);
  if (field === 'drawSize') return renderDrawSize(data);
  if (field === 'entries') return renderEntries(data);
  if (field === 'matchUpFormat') return renderMatchUpFormat(data);
  if (field === 'flightNumber') return renderFlightNumber(data);
  if (field === 'ratings') return renderRatings(data);
  if (field === 'matchUpProgress') return renderMatchUpProgress(data);
  return null;
}

function buildBodyZone(data: DrawCardData, cfg: DrawCardConfig): HTMLElement {
  const body = document.createElement('div');
  body.className = dcBodyStyle();
  for (const f of cfg.body) {
    const el = renderField(f, data);
    if (el) body.appendChild(el);
  }
  return body;
}

function buildFooterZone(data: DrawCardData, cfg: DrawCardConfig): HTMLElement {
  const footer = document.createElement('div');
  footer.className = dcFooterStyle();
  for (const f of cfg.footer) {
    const el = renderField(f, data);
    if (el) footer.appendChild(el);
  }
  return footer;
}
