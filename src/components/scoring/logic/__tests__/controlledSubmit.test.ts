/**
 * What makes a host's `onSubmit` CONTROLLED, and what counts as a refusal: a rejection, or a fulfilled value carrying
 * a truthy `error` (the factory's result shape). The dialog's behaviour on each is in
 * `src/stories/ScoreEntryControlledSubmitTests.stories.ts`.
 */
import { isThenable, messageOf, refusalOf } from '../controlledSubmit';
import { describe, expect, it } from 'vitest';

describe('controlled submission', () => {
  it('is controlled only when onSubmit returned something to wait on', () => {
    expect(isThenable(Promise.resolve())).toBe(true);
    expect(isThenable({ then: () => undefined })).toBe(true);
    expect(isThenable(undefined)).toBe(false);
    expect(isThenable({ success: true })).toBe(false);
  });

  it('a fulfilled value is a refusal only when it carries an error', () => {
    expect(refusalOf(undefined)).toBeUndefined();
    expect(refusalOf({ success: true })).toBeUndefined();
    expect(refusalOf({ error: undefined })).toBeUndefined();
    expect(refusalOf({ error: { message: 'Cannot change winningSide', code: 'X' } })).toBe('Cannot change winningSide');
    expect(refusalOf({ error: { code: 'ERR_LOCKED' } })).toBe('ERR_LOCKED');
    expect(refusalOf({ error: 'refused' })).toBe('refused');
    expect(refusalOf({ error: true })).toBe('');
  });

  it('a rejection reads as its message, its code, itself, or nothing', () => {
    expect(messageOf(new Error('unreachable'))).toBe('unreachable');
    expect(messageOf({ code: 'TIMEOUT' })).toBe('TIMEOUT');
    expect(messageOf('offline')).toBe('offline');
    expect(messageOf(undefined)).toBe('');
    expect(messageOf(42)).toBe('');
  });
});
