// @vitest-environment happy-dom
/**
 * The editor's set count: "Best of" offers 7 and 9, and "Exactly" exists only for timed sets.
 *
 * Factory 7.5.0 (#5136) parses ANY best-of count — CA: *"I don't see why best of 7 or 9 would be
 * rejected"* — so the editor offers them. It keeps `X` (exactly) TIMED-ONLY: `SET3X-S:6/TB7` does not
 * parse, and `stringify` returns undefined for an exactly count on a games or tiebreak set. The editor
 * therefore must never leave "Exactly" standing on a set that is not timed. It does this in two
 * places, both pinned here through the real editor: choosing Exactly turns the set into a timed set,
 * and turning the set into anything else falls back to Best of.
 *
 * Every code the editor shows is asserted to parse, so an editor that emits a code the factory
 * refuses fails here rather than at score entry.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { matchUpFormatCode } from 'tods-competition-factory';

import { getMatchUpFormatModal } from '../matchUpFormat';

const clickable = (el: Element | null): HTMLElement => {
  if (!el) throw new Error('element not found');
  return el as HTMLElement;
};

function shownCode(): string {
  return clickable(document.getElementById('matchUpFormatString')).textContent?.trim() ?? '';
}

function openOptions(buttonId: string): string[] {
  clickable(document.getElementById(buttonId)).click();
  const items = document.querySelectorAll('.dropdown.is-active .dropdown-menu > div');
  return Array.from(items).map((item) => item.textContent ?? '');
}

function choose(buttonId: string, text: string): void {
  openOptions(buttonId);
  const items = Array.from(document.querySelectorAll('.dropdown.is-active .dropdown-menu > div'));
  clickable(items.find((item) => item.textContent === text) ?? null).click();
}

function expectParses(code: string): void {
  expect(code).not.toBe('');
  expect(matchUpFormatCode.parse(code), code).toBeTruthy();
}

describe('the matchUpFormat editor: set count and descriptor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('Best of offers 7 and 9, and each is a code the factory parses', () => {
    getMatchUpFormatModal({ existingMatchUpFormat: 'SET3-S:6/TB7' });

    expect(openOptions('bestOf')).toEqual(['1', '3', '5', '7', '9']);

    choose('bestOf', '7');
    expect(shownCode()).toBe('SET7-S:6/TB7');
    expectParses(shownCode());

    choose('bestOf', '9');
    expect(shownCode()).toBe('SET9-S:6/TB7');
    expectParses(shownCode());
  });

  it('a best of 7 or 9 code opens with its count selected', () => {
    getMatchUpFormatModal({ existingMatchUpFormat: 'SET9-S:6/TB7-F:TB10' });

    expect(clickable(document.getElementById('bestOf')).textContent).toContain('9');
    expect(shownCode()).toBe('SET9-S:6/TB7-F:TB10');
  });

  it('choosing Exactly on a games set turns it into a timed set', () => {
    getMatchUpFormatModal({ existingMatchUpFormat: 'SET3-S:6/TB7' });

    choose('descriptor', 'Exactly');

    expect(shownCode()).toMatch(/^SET3X-S:T\d+/);
    expectParses(shownCode());
  });

  it('turning an Exactly timed set into games sets falls back to Best of', () => {
    getMatchUpFormatModal({ existingMatchUpFormat: 'SET3X-S:T10' });

    choose('what', 'Sets');

    expect(clickable(document.getElementById('descriptor')).textContent).toContain('Best of');
    expect(shownCode()).not.toContain('X');
    expect(shownCode()).toMatch(/^SET3-S:6/);
    expectParses(shownCode());
  });

  it('turning an Exactly timed set into tiebreak sets falls back to Best of', () => {
    getMatchUpFormatModal({ existingMatchUpFormat: 'SET2X-S:T10' });

    choose('what', 'Tiebreaks');

    expect(clickable(document.getElementById('descriptor')).textContent).toContain('Best of');
    expect(shownCode()).not.toContain('X');
    // An even exactly count has no best-of equivalent; the fallback moves to the next odd count.
    expect(shownCode()).toMatch(/^SET3-S:TB/);
    expectParses(shownCode());
  });
});
