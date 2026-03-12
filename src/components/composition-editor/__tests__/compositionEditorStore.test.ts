import { describe, it, expect, vi } from 'vitest';
import { CompositionEditorStore } from '../compositionEditorStore';

const THEME_AUSTRALIAN = 'chc-theme-australian';
const THEME_FRENCH = 'chc-theme-french';
const THEME_BASIC = 'chc-theme-basic';

describe('CompositionEditorStore', () => {
  it('initializes with defaults when no composition provided', () => {
    const store = new CompositionEditorStore({});
    const state = store.getState();
    expect(state.compositionName).toBe('Custom');
    expect(state.theme).toBe('');
    expect(state.configuration).toEqual({});
    expect(state.isDirty).toBe(false);
    expect(state.readOnly).toBe(false);
    expect(state.expandedSections.has('theme')).toBe(true);
    expect(state.expandedSections.has('display')).toBe(true);
  });

  it('initializes from provided composition', () => {
    const store = new CompositionEditorStore({
      composition: { theme: THEME_AUSTRALIAN, configuration: { flags: true, scoreBox: true } },
      compositionName: 'Test',
    });
    const state = store.getState();
    expect(state.compositionName).toBe('Test');
    expect(state.theme).toBe(THEME_AUSTRALIAN);
    expect(state.configuration.flags).toBe(true);
    expect(state.configuration.scoreBox).toBe(true);
  });

  it('notifies listeners on state change', () => {
    const store = new CompositionEditorStore({});
    const listener = vi.fn();
    store.subscribe(listener);

    store.setTheme(THEME_FRENCH);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].theme).toBe(THEME_FRENCH);
  });

  it('unsubscribe stops notifications', () => {
    const store = new CompositionEditorStore({});
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    store.setTheme(THEME_FRENCH);
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    store.setTheme(THEME_BASIC);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('setConfigField updates configuration and marks dirty', () => {
    const store = new CompositionEditorStore({});
    store.setConfigField('flags', true);
    const state = store.getState();
    expect(state.configuration.flags).toBe(true);
    expect(state.isDirty).toBe(true);
  });

  it('setConfigNestedField updates nested object', () => {
    const store = new CompositionEditorStore({});
    store.setConfigNestedField('gameScore', 'position', 'leading');
    store.setConfigNestedField('gameScore', 'inverted', true);
    const state = store.getState();
    expect(state.configuration.gameScore?.position).toBe('leading');
    expect(state.configuration.gameScore?.inverted).toBe(true);
  });

  it('setConfiguration replaces entire config', () => {
    const store = new CompositionEditorStore({
      composition: { theme: 'x', configuration: { flags: true, scoreBox: true } },
    });
    store.setConfiguration({ centerInfo: true });
    const state = store.getState();
    expect(state.configuration.centerInfo).toBe(true);
    expect(state.configuration.flags).toBeUndefined();
    expect(state.configuration.scoreBox).toBeUndefined();
  });

  it('loadComposition sets all fields and resets dirty', () => {
    const store = new CompositionEditorStore({});
    store.setConfigField('flags', true); // Make dirty
    expect(store.getState().isDirty).toBe(true);

    store.loadComposition('French', THEME_FRENCH, { bracketedSeeds: true, flags: true });
    const state = store.getState();
    expect(state.compositionName).toBe('French');
    expect(state.theme).toBe(THEME_FRENCH);
    expect(state.configuration.bracketedSeeds).toBe(true);
    expect(state.isDirty).toBe(false);
  });

  it('resetToInitial restores original values', () => {
    const store = new CompositionEditorStore({
      composition: { theme: THEME_AUSTRALIAN, configuration: { flags: true } },
      compositionName: 'Original',
    });

    store.setTheme(THEME_FRENCH);
    store.setConfigField('scoreBox', true);
    store.setCompositionName('Changed');
    expect(store.getState().isDirty).toBe(true);

    store.resetToInitial();
    const state = store.getState();
    expect(state.compositionName).toBe('Original');
    expect(state.theme).toBe(THEME_AUSTRALIAN);
    expect(state.configuration.flags).toBe(true);
    expect(state.configuration.scoreBox).toBeUndefined();
    expect(state.isDirty).toBe(false);
  });

  it('toggleSection expands and collapses', () => {
    const store = new CompositionEditorStore({});

    // 'score' starts collapsed
    expect(store.getState().expandedSections.has('score')).toBe(false);

    store.toggleSection('score');
    expect(store.getState().expandedSections.has('score')).toBe(true);

    store.toggleSection('score');
    expect(store.getState().expandedSections.has('score')).toBe(false);
  });

  it('calls onChange callback on theme and config changes', () => {
    const onChange = vi.fn();
    const store = new CompositionEditorStore({ onChange });

    store.setTheme(THEME_BASIC);
    expect(onChange).toHaveBeenCalledWith({
      theme: THEME_BASIC,
      configuration: {},
    });

    store.setConfigField('flags', true);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0].configuration.flags).toBe(true);
  });

  it('readOnly state is preserved', () => {
    const store = new CompositionEditorStore({ readOnly: true });
    expect(store.getState().readOnly).toBe(true);
  });

  it('does not mutate original config on setConfigField', () => {
    const original = { flags: true };
    const store = new CompositionEditorStore({
      composition: { theme: 'x', configuration: original },
    });
    store.setConfigField('scoreBox', true);
    expect(original).toEqual({ flags: true }); // Original not mutated
  });
});
