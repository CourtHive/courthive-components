/**
 * @vitest-environment happy-dom
 */
import { buildTeamCard } from '../buildTeamCard';
import { afterEach, describe, expect, it, vi } from 'vitest';

const NICKNAME_SELECTOR = '.chc-team-card__nickname';
const COUNTS_SELECTOR = '.chc-team-card__counts';

describe('buildTeamCard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders the team name on the title row', () => {
    const card = buildTeamCard({ teamName: 'Altitude' });
    const name = card.querySelector('.chc-team-card__name');
    expect(name?.textContent).toBe('Altitude');
  });

  it('omits the nickname element when no nickname is provided', () => {
    const card = buildTeamCard({ teamName: 'Altitude' });
    expect(card.querySelector(NICKNAME_SELECTOR)).toBeNull();
  });

  it('wraps the nickname in italic quotes when provided', () => {
    const card = buildTeamCard({ teamName: 'Altitude', nickname: 'ALT' });
    const nick = card.querySelector(NICKNAME_SELECTOR);
    expect(nick?.textContent).toBe('"ALT"');
  });

  it('joins count segments with " · " separator', () => {
    const card = buildTeamCard({
      teamName: 'Altitude',
      countSegments: ['9 players', '1 coach', '1 physio'],
    });
    const counts = card.querySelector(COUNTS_SELECTOR);
    expect(counts?.textContent).toBe('9 players · 1 coach · 1 physio');
  });

  it('drops empty / whitespace-only segments before rendering', () => {
    const card = buildTeamCard({
      teamName: 'Altitude',
      countSegments: ['9 players', '', '   ', '1 coach'],
    });
    const counts = card.querySelector(COUNTS_SELECTOR);
    expect(counts?.textContent).toBe('9 players · 1 coach');
  });

  it('omits the counts row entirely when no usable segments remain', () => {
    const card = buildTeamCard({ teamName: 'Altitude', countSegments: ['', '  '] });
    expect(card.querySelector(COUNTS_SELECTOR)).toBeNull();
  });

  it('exposes teamId via data-team-id attribute when provided', () => {
    const card = buildTeamCard({ teamId: 'team-altitude', teamName: 'Altitude' });
    expect(card.dataset.teamId).toBe('team-altitude');
  });

  it('does not add clickable affordances when no onClick callback is given', () => {
    const card = buildTeamCard({ teamName: 'Altitude' });
    expect(card.classList.contains('chc-team-card--clickable')).toBe(false);
    expect(card.getAttribute('role')).toBeNull();
    expect(card.tabIndex).toBe(-1);
  });

  it('wires click + Enter + Space activation when onClick is provided', () => {
    const onClick = vi.fn();
    const data = { teamId: 't1', teamName: 'Altitude' };
    const card = buildTeamCard(data, { onClick });

    expect(card.classList.contains('chc-team-card--clickable')).toBe(true);
    expect(card.getAttribute('role')).toBe('button');
    expect(card.tabIndex).toBe(0);

    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).toHaveBeenLastCalledWith(data);

    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(2);

    card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(3);

    // Non-activating keys do not trigger the handler.
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(3);
  });
});
