/**
 * What the composition editor saves and how its schedule-header memory behaves, without a DOM.
 *
 * `createCompositionEditor().getComposition()` is `compositionSnapshot(store.getState())`; these tests drive
 * the same store the editor's controls drive. The controls themselves (accordion, colour fields, toggles,
 * read-only) are asserted in Chromium by `src/stories/CompositionEditorTests.stories.ts`.
 */
import { applyCompositionColors, clearCompositionColors } from '../../../styles/applyCompositionColors';
import { CompositionEditorStore, scheduleHeaderDisabled } from '../compositionEditorStore';
import { compositions } from '../../../compositions/compositions';
import { compositionSnapshot } from '../compositionSnapshot';
import { describe, expect, it } from 'vitest';

// constants and types
import type { CompositionColors } from '../../../types';

const HEADER_DETAILS = { elapsed: true, eventRound: true, layout: 'inline' as const };

/** A JSON round trip, not a copy: what a host stores as text and hands back on the next open. */
function persisted(store: CompositionEditorStore) {
  const stored = JSON.stringify(compositionSnapshot(store.getState()));
  return JSON.parse(stored);
}

/** Records the custom properties `applyCompositionColors` writes; the function touches nothing else. */
function styleRecorder() {
  const properties = new Map<string, string>();
  const style = {
    setProperty: (name: string, value: string) => void properties.set(name, value),
    removeProperty: (name: string) => void properties.delete(name)
  };
  return { properties, element: { style } as unknown as HTMLElement };
}

describe('compositionSnapshot', () => {
  it('saves name, theme and configuration with format version 1', () => {
    const store = new CompositionEditorStore({
      compositionName: 'Test',
      composition: { theme: 'chc-theme-french', configuration: { flags: true } }
    });
    expect(compositionSnapshot(store.getState())).toEqual({
      compositionName: 'Test',
      theme: 'chc-theme-french',
      configuration: { flags: true },
      version: 1
    });
  });

  it('strips runtime-only fields and any function value', () => {
    const store = new CompositionEditorStore({
      composition: {
        theme: 'x',
        configuration: {
          flags: true,
          participantProvider: () => [],
          persistInputFields: true,
          inlineAssignment: true,
          renderers: { matchUp: () => undefined },
          gameScore: { position: 'trailing', format: () => '' }
        } as any
      }
    });
    const saved = compositionSnapshot(store.getState());
    expect(saved.configuration).toEqual({ flags: true, gameScore: { position: 'trailing' } });
  });

  it('returns a detached copy: editing the snapshot does not reach the store', () => {
    const store = new CompositionEditorStore({ composition: compositions.Australian });
    const saved = compositionSnapshot(store.getState());
    saved.configuration.flags = !saved.configuration.flags;
    expect(store.getState().configuration.flags).toBe(compositions.Australian.configuration!.flags);
  });

  it('round-trips edited accent colours through JSON into a new editor', () => {
    const store = new CompositionEditorStore({ composition: compositions['Broadcast Bold'] });
    store.setColorField('accent', '#ff6a00');
    store.setColorField('accentText', '#ffffff');
    const saved = persisted(store);
    expect(saved.colors).toEqual({ accent: '#ff6a00', accentText: '#ffffff' });
    const reopened = new CompositionEditorStore({ composition: saved });
    expect(compositionSnapshot(reopened.getState()).colors).toEqual({ accent: '#ff6a00', accentText: '#ffffff' });
  });

  it('round-trips schedule-header colours through JSON into a new editor', () => {
    const colors: CompositionColors = {
      scheduleHeaderText: '#ffffff',
      scheduleHeaderBackground: '#123456',
      scheduleHeaderDivider: '#ff6a00'
    };
    const saved = persisted(new CompositionEditorStore({ composition: { ...compositions.Scoreboard, colors } }));
    expect(saved.colors).toEqual(colors);
    expect(persisted(new CompositionEditorStore({ composition: saved })).colors).toEqual(colors);
  });

  it('saves a hidden schedule header as off, without the remembered details', () => {
    const store = new CompositionEditorStore({ composition: compositions.Watch });
    store.setScheduleInfoEnabled(false);
    const saved = persisted(store);
    expect(saved.configuration.scheduleInfo).toBe(false);
    expect(JSON.stringify(saved)).not.toContain('scheduleInfoChoice');
    // reopened, the editor has nothing stale to restore: turning the header on gives the plain header
    const reopened = new CompositionEditorStore({ composition: saved });
    reopened.setScheduleInfoEnabled(true);
    expect(reopened.getState().configuration.scheduleInfo).toBe(true);
  });
});

describe('schedule header memory', () => {
  it('ignores header details while the header is off and restores them on re-enable', () => {
    const store = new CompositionEditorStore({
      composition: { theme: '', configuration: { scheduleInfo: HEADER_DETAILS } }
    });
    store.setScheduleInfoEnabled(false);
    expect(store.getState().configuration.scheduleInfo).toBe(false);
    expect(scheduleHeaderDisabled(store.getState())).toBe(true);
    // a header detail changed while the header is hidden cannot turn it back on
    store.setScheduleInfoOption('layout', undefined);
    expect(store.getState().configuration.scheduleInfo).toBe(false);
    store.setScheduleInfoEnabled(true);
    expect(store.getState().configuration.scheduleInfo).toEqual(HEADER_DETAILS);
    expect(scheduleHeaderDisabled(store.getState())).toBe(false);
    store.setScheduleInfoOption('elapsed', false);
    expect(store.getState().configuration.scheduleInfo).toEqual({ ...HEADER_DETAILS, elapsed: false });
  });

  it('locks the header details in read-only mode, even with a visible header', () => {
    const store = new CompositionEditorStore({ composition: compositions.Scoreboard, readOnly: true });
    expect(store.getState().configuration.scheduleInfo).toBeTruthy();
    expect(scheduleHeaderDisabled(store.getState())).toBe(true);
  });

  it('resets remembered choices on preset load, configuration replacement and reset', () => {
    const store = new CompositionEditorStore({ composition: compositions.Watch });
    store.setScheduleInfoEnabled(false);
    store.loadComposition('Australian', compositions.Australian.theme, compositions.Australian.configuration!);
    store.setScheduleInfoEnabled(true);
    expect(store.getState().configuration.scheduleInfo).toBe(true);
    store.setConfigField('scheduleInfo', HEADER_DETAILS);
    store.setScheduleInfoEnabled(false);
    store.setConfiguration({ scheduleInfo: true });
    store.setScheduleInfoEnabled(true);
    expect(store.getState().configuration.scheduleInfo).toBe(true);
    store.resetToInitial();
    expect(store.getState().configuration.scheduleInfo).toEqual(compositions.Watch.configuration!.scheduleInfo);
  });
});

describe('applyCompositionColors', () => {
  it('maps schedule-header colours to their custom properties and clears every mapped one', () => {
    const { element, properties } = styleRecorder();
    applyCompositionColors(element, {
      scheduleHeaderText: '#ffffff',
      scheduleHeaderBackground: '#123456',
      scheduleHeaderDivider: '#ff6a00',
      accent: '#00bedc'
    });
    expect(Object.fromEntries(properties)).toEqual({
      '--chc-color-schedule-header-text': '#ffffff',
      '--chc-color-schedule-header-bg': '#123456',
      '--chc-color-schedule-header-divider': '#ff6a00',
      '--chc-color-accent': '#00bedc'
    });
    clearCompositionColors(element);
    expect(properties.size).toBe(0);
  });

  it('writes nothing for absent or empty colours', () => {
    const { element, properties } = styleRecorder();
    applyCompositionColors(element, undefined);
    applyCompositionColors(element, { accent: '' });
    expect(properties.size).toBe(0);
  });
});
