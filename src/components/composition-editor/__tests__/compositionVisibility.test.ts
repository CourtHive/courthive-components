/** @vitest-environment happy-dom */
import { applyCompositionColors, clearCompositionColors } from '../../../styles/applyCompositionColors';
import { CompositionEditorStore } from '../compositionEditorStore';
import { compositions } from '../../../compositions/compositions';
import { buildLayoutSection } from '../sections/layoutSection';
import { createCompositionEditor } from '../compositionEditor';
import { afterEach, describe, expect, it } from 'vitest';

const SCHEDULE = 'Schedule info';
const PLAYING_TIME = 'Playing time';
const HEADER_LAYOUT = 'Header layout';
const ROUND_HEADERS = '.ce-preview-body .chc-round-header';
const HEADER_DETAILS = { elapsed: true, eventRound: true, layout: 'inline' as const };

function field(root: HTMLElement, label: string): HTMLInputElement | HTMLSelectElement {
  const row = [...root.querySelectorAll('.ce-field')].find(
    (element) => element.querySelector('.ce-field-label')?.textContent === label
  );
  return row!.querySelector('input, select')!;
}

afterEach(() => document.body.replaceChildren());

describe('composition visibility contract', () => {
  it('renders round headers in both previews only when enabled', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = createCompositionEditor(container, { composition: compositions.Australian });
    expect(container.querySelectorAll(ROUND_HEADERS)).toHaveLength(0);
    [...container.querySelectorAll<HTMLElement>('.ce-section-header')]
      .find((element) => element.textContent?.includes('Layout'))!
      .click();
    field(container, 'Round header').click();
    expect(container.querySelectorAll(ROUND_HEADERS).length).toBeGreaterThan(1);
    field(container, 'Round header').click();
    expect(container.querySelectorAll(ROUND_HEADERS)).toHaveLength(0);
    editor.destroy();
  });

  it('disables hidden header details and restores them on re-enable', () => {
    const store = new CompositionEditorStore({
      composition: { theme: '', configuration: { scheduleInfo: HEADER_DETAILS } }
    });
    const panel = buildLayoutSection(store);
    document.body.appendChild(panel.element);
    const unsubscribe = store.subscribe(panel.update);
    panel.update(store.getState());
    field(panel.element, SCHEDULE).click();
    expect(store.getState().configuration.scheduleInfo).toBe(false);
    expect(field(panel.element, PLAYING_TIME).disabled).toBe(true);
    expect(field(panel.element, 'Event & round').disabled).toBe(true);
    expect(field(panel.element, HEADER_LAYOUT).disabled).toBe(true);
    // Even a synthetic event on a disabled control cannot turn the header back on.
    field(panel.element, HEADER_LAYOUT).dispatchEvent(new Event('change'));
    expect(store.getState().configuration.scheduleInfo).toBe(false);
    field(panel.element, SCHEDULE).click();
    expect(store.getState().configuration.scheduleInfo).toEqual(HEADER_DETAILS);
    expect(field(panel.element, PLAYING_TIME).disabled).toBe(false);
    unsubscribe();
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

  it('exports the hidden state without hidden choices and reopens it without stale state', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = createCompositionEditor(container, { composition: compositions.Watch });
    [...container.querySelectorAll<HTMLElement>('.ce-section-header')]
      .find((element) => element.textContent?.includes('Layout'))!
      .click();
    field(container, SCHEDULE).click();
    const serialized = JSON.stringify(editor.getComposition());
    const saved = JSON.parse(serialized);
    expect(saved.configuration.scheduleInfo).toBe(false);
    expect(JSON.stringify(saved)).not.toContain('scheduleInfoChoice');
    editor.destroy();
    const reopened = createCompositionEditor(container, { composition: saved });
    expect(container.querySelector('.ce-preview-body .chc-scheduling')).toBeNull();
    reopened.destroy();
    expect(container.children).toHaveLength(0);
  });

  it('keeps every header control disabled in read-only mode, even with a visible header', () => {
    const store = new CompositionEditorStore({ composition: compositions.Scoreboard, readOnly: true });
    const panel = buildLayoutSection(store);
    panel.update(store.getState());
    for (const label of [SCHEDULE, PLAYING_TIME, 'Event & round', HEADER_LAYOUT]) {
      expect(field(panel.element, label).disabled).toBe(true);
    }
  });

  it('persists schedule-header colors, reopens them and clears all mapped overrides', () => {
    const colors = {
      scheduleHeaderText: '#ffffff',
      scheduleHeaderBackground: '#123456',
      scheduleHeaderDivider: '#ff6a00'
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = createCompositionEditor(container, { composition: { ...compositions.Scoreboard, colors } });
    const serialized = JSON.stringify(editor.getComposition());
    const saved = JSON.parse(serialized);
    expect(saved.colors).toEqual(colors);
    editor.destroy();
    const reopened = createCompositionEditor(container, { composition: saved });
    expect(reopened.getComposition().colors).toEqual(colors);
    const probe = document.createElement('div');
    applyCompositionColors(probe, colors);
    expect(probe.style.getPropertyValue('--chc-color-schedule-header-text')).toBe(colors.scheduleHeaderText);
    expect(probe.style.getPropertyValue('--chc-color-schedule-header-bg')).toBe(colors.scheduleHeaderBackground);
    expect(probe.style.getPropertyValue('--chc-color-schedule-header-divider')).toBe(colors.scheduleHeaderDivider);
    clearCompositionColors(probe);
    expect(probe.style.length).toBe(0);
    reopened.destroy();
  });
});
