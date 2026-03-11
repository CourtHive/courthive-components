/**
 * Additional edge case tests for CompositionEditorStore.
 */
import { describe, it, expect, vi } from 'vitest';
import { CompositionEditorStore } from '../compositionEditorStore';

describe('CompositionEditorStore — edge cases', () => {
  it('multiple listeners all receive notifications', () => {
    const store = new CompositionEditorStore({});
    const l1 = vi.fn();
    const l2 = vi.fn();
    const l3 = vi.fn();
    store.subscribe(l1);
    store.subscribe(l2);
    store.subscribe(l3);

    store.setTheme('test-theme');

    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
    expect(l3).toHaveBeenCalledTimes(1);
  });

  it('unsubscribing one listener does not affect others', () => {
    const store = new CompositionEditorStore({});
    const l1 = vi.fn();
    const l2 = vi.fn();
    const unsub1 = store.subscribe(l1);
    store.subscribe(l2);

    unsub1();
    store.setTheme('test');

    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it('setCompositionName does NOT call onChange (name is metadata, not composition data)', () => {
    const onChange = vi.fn();
    const store = new CompositionEditorStore({ onChange });
    store.setCompositionName('New Name');
    // setCompositionName only calls emit(), not notifyChange()
    expect(onChange).not.toHaveBeenCalled();
  });

  it('setConfigField with same value still marks dirty', () => {
    const store = new CompositionEditorStore({
      composition: { theme: 'x', configuration: { flags: true } },
    });
    store.setConfigField('flags', true);
    expect(store.getState().isDirty).toBe(true);
  });

  it('setConfigNestedField preserves existing nested keys', () => {
    const store = new CompositionEditorStore({});
    store.setConfigNestedField('scaleAttributes', 'scaleName', 'WTN');
    store.setConfigNestedField('scaleAttributes', 'scaleColor', 'red');

    const attrs = store.getState().configuration.scaleAttributes;
    expect(attrs?.scaleName).toBe('WTN');
    expect(attrs?.scaleColor).toBe('red');
  });

  it('setConfiguration does not preserve previous config fields', () => {
    const store = new CompositionEditorStore({});
    store.setConfigField('flags', true);
    store.setConfigField('scoreBox', true);
    store.setConfiguration({ centerInfo: true });

    const config = store.getState().configuration;
    expect(config.centerInfo).toBe(true);
    expect(config.flags).toBeUndefined();
    expect(config.scoreBox).toBeUndefined();
  });

  it('loadComposition replaces everything including expanded sections', () => {
    const store = new CompositionEditorStore({});
    store.toggleSection('score'); // expand score
    expect(store.getState().expandedSections.has('score')).toBe(true);

    store.loadComposition('ITF', 'chc-theme-itf', { winnerChevron: true });
    // Expanded sections should be unchanged (loadComposition only sets name/theme/config/dirty)
    expect(store.getState().expandedSections.has('score')).toBe(true);
  });

  it('toggleSection with all section IDs works', () => {
    const store = new CompositionEditorStore({});
    const sectionIds = ['theme', 'display', 'score', 'participant', 'placeholder', 'scale', 'layout'] as const;

    for (const id of sectionIds) {
      store.toggleSection(id);
    }

    // All should be expanded (theme and display were already expanded by default)
    const expanded = store.getState().expandedSections;
    expect(expanded.has('score')).toBe(true);
    expect(expanded.has('participant')).toBe(true);
    expect(expanded.has('placeholder')).toBe(true);
    expect(expanded.has('scale')).toBe(true);
    expect(expanded.has('layout')).toBe(true);
    // theme and display were toggled (expanded → collapsed)
    expect(expanded.has('theme')).toBe(false);
    expect(expanded.has('display')).toBe(false);
  });

  it('resetToInitial with no original composition resets to empty', () => {
    const store = new CompositionEditorStore({});
    store.setTheme('chc-theme-french');
    store.setConfigField('flags', true);
    store.setCompositionName('Modified');

    store.resetToInitial();

    const state = store.getState();
    expect(state.compositionName).toBe('Custom');
    expect(state.theme).toBe('');
    expect(state.configuration).toEqual({});
    expect(state.isDirty).toBe(false);
  });

  it('onChange receives correct theme and config on setConfiguration', () => {
    const onChange = vi.fn();
    const store = new CompositionEditorStore({ onChange });
    store.setTheme('chc-theme-basic');
    store.setConfiguration({ flags: true, roundHeader: true });

    expect(onChange).toHaveBeenCalledTimes(2);
    const lastCall = onChange.mock.calls[1][0];
    expect(lastCall.theme).toBe('chc-theme-basic');
    expect(lastCall.configuration.flags).toBe(true);
    expect(lastCall.configuration.roundHeader).toBe(true);
  });

  it('listener receives latest state on rapid successive changes', () => {
    const store = new CompositionEditorStore({});
    const states: string[] = [];
    store.subscribe((state) => states.push(state.theme));

    store.setTheme('a');
    store.setTheme('b');
    store.setTheme('c');

    expect(states).toEqual(['a', 'b', 'c']);
  });

  it('placeHolders nested fields work correctly', () => {
    const store = new CompositionEditorStore({});
    store.setConfigNestedField('placeHolders', 'tbd', 'TBA');
    store.setConfigNestedField('placeHolders', 'bye', 'BYE');
    store.setConfigNestedField('placeHolders', 'qualifier', 'Q');

    const ph = store.getState().configuration.placeHolders;
    expect(ph?.tbd).toBe('TBA');
    expect(ph?.bye).toBe('BYE');
    expect(ph?.qualifier).toBe('Q');
  });

  it('gameScore nested fields work correctly', () => {
    const store = new CompositionEditorStore({});
    store.setConfigNestedField('gameScore', 'position', 'leading');
    store.setConfigNestedField('gameScore', 'inverted', false);

    const gs = store.getState().configuration.gameScore;
    expect(gs?.position).toBe('leading');
    expect(gs?.inverted).toBe(false);
  });

  it('inlineScoring config can be set via setConfigField', () => {
    const store = new CompositionEditorStore({});
    store.setConfigField('inlineScoring', { mode: 'points', showFooter: true, showSituation: true });

    const is = store.getState().configuration.inlineScoring;
    expect(is?.mode).toBe('points');
    expect(is?.showFooter).toBe(true);
  });
});
