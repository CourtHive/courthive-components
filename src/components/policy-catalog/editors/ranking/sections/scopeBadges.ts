/**
 * Scope Badges — Renders award profile scope as colored re-badge tags.
 */
import type { AwardProfileData } from '../types';
import { getProfileScopeBadges } from '../domain/rankingProjections';

export function buildScopeBadges(profile: AwardProfileData): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = 'display:inline-flex;gap:0.25rem;flex-wrap:wrap;margin-bottom:0';

  const badges = getProfileScopeBadges(profile);

  if (!badges.length) {
    const tag = document.createElement('span');
    tag.className = 're-badge re-badge--neutral';
    tag.textContent = 'All';
    container.appendChild(tag);
    return container;
  }

  for (const badge of badges) {
    const tag = document.createElement('span');
    tag.className = `re-badge ${badge.intent}`;
    tag.textContent = badge.label;
    container.appendChild(tag);
  }

  return container;
}
