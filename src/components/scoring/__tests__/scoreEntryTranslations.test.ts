/**
 * `scoreEntryText`: a host's string for a key, or the English, with its placeholders filled.
 *
 * That every word the dialog SHOWS goes through it — the walk through every state with each key replaced
 * by a marker, and the check that no state was left unvisited — is rendered text, and lives in
 * `src/stories/ScoreEntryTranslationsTests.stories.ts`.
 */
import { scoreEntryText } from '../logic/scoreEntryText';
import { describe, it, expect } from 'vitest';

describe('scoreEntryText', () => {
  it('fills placeholders, and falls back to English for a key the host left out', () => {
    expect(
      scoreEntryText({ sidePanelHead: 'Que s’est-il passé pour {{name}} ?' }, 'sidePanelHead', { name: 'Ann' })
    ).toBe('Que s’est-il passé pour Ann ?');
    expect(scoreEntryText({}, 'sidePanelHead', { name: 'Ann' })).toBe('What happened to Ann?');
    expect(scoreEntryText(undefined, 'submit')).toBe('Submit');
  });

  it('leaves a placeholder with no value as written, so a missing variable is visible', () => {
    expect(scoreEntryText({}, 'sidePanelHead')).toBe('What happened to {{name}}?');
  });
});
