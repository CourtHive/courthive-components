import type { CompositionEditorState, EditorPanel } from '../compositionEditorTypes';
import type { CompositionEditorStore } from '../compositionEditorStore';
import { buildToggleField, buildSelectField } from './fieldBuilders';
import type { ScheduleInfoOptions } from '../../../types';
import { ceSubgroup, ceSubgroupTitle } from '../styles';

const headerOptionsOf = (scheduleInfo: unknown): ScheduleInfoOptions =>
  scheduleInfo && typeof scheduleInfo === 'object' ? (scheduleInfo as ScheduleInfoOptions) : {};

function subgroup(title: string, ...fields: { element: HTMLElement }[]): HTMLElement {
  const group = document.createElement('div');
  group.className = ceSubgroup();
  const heading = document.createElement('div');
  heading.className = ceSubgroupTitle();
  heading.textContent = title;
  group.appendChild(heading);
  for (const field of fields) group.appendChild(field.element);
  return group;
}

export function buildLayoutSection(store: CompositionEditorStore): EditorPanel {
  const root = document.createElement('div');
  const readOnly = store.getState().readOnly;
  const cfg = store.getState().configuration;

  const scheduleInfo = buildToggleField(
    'Schedule info',
    !!cfg.scheduleInfo,
    (v) => store.setConfigField('scheduleInfo', v),
    readOnly
  );
  // configuration.scheduleInfo as an object; any of these turns the header on
  const setHeaderOption = (key: keyof ScheduleInfoOptions, value: unknown) =>
    store.setConfigField('scheduleInfo', {
      ...headerOptionsOf(store.getState().configuration.scheduleInfo),
      [key]: value
    });
  const elapsed = buildToggleField(
    'Playing time',
    !!headerOptionsOf(cfg.scheduleInfo).elapsed,
    (v) => setHeaderOption('elapsed', v),
    readOnly
  );
  const eventRound = buildToggleField(
    'Event & round',
    !!headerOptionsOf(cfg.scheduleInfo).eventRound,
    (v) => setHeaderOption('eventRound', v),
    readOnly
  );
  const headerLayout = buildSelectField(
    'Header layout',
    [
      { value: '', label: 'Split' },
      { value: 'inline', label: 'Inline' }
    ],
    headerOptionsOf(cfg.scheduleInfo).layout === 'inline' ? 'inline' : '',
    (v) => setHeaderOption('layout', v === 'inline' ? 'inline' : undefined),
    readOnly
  );
  const liveStatusPill = buildToggleField(
    'LIVE pill',
    cfg.liveStatusPill !== false,
    (v) => store.setConfigField('liveStatusPill', v ? undefined : false),
    readOnly
  );
  // configuration.matchUpActions
  const setAction = (key: 'watch' | 'share', value: boolean) =>
    store.setConfigField('matchUpActions', { ...store.getState().configuration.matchUpActions, [key]: value });
  const watchAction = buildToggleField(
    'Watch button',
    !!cfg.matchUpActions?.watch,
    (v) => setAction('watch', v),
    readOnly
  );
  const shareAction = buildToggleField(
    'Share button',
    !!cfg.matchUpActions?.share,
    (v) => setAction('share', v),
    readOnly
  );

  const roundHeader = buildToggleField(
    'Round header',
    !!cfg.roundHeader,
    (v) => store.setConfigField('roundHeader', v),
    readOnly
  );
  const matchUpFooter = buildToggleField(
    'MatchUp footer',
    !!cfg.matchUpFooter,
    (v) => store.setConfigField('matchUpFooter', v),
    readOnly
  );
  const centerInfo = buildToggleField(
    'Center info',
    !!cfg.centerInfo,
    (v) => store.setConfigField('centerInfo', v),
    readOnly
  );
  const resultsInfo = buildToggleField(
    'Set number',
    !!cfg.resultsInfo,
    (v) => store.setConfigField('resultsInfo', v),
    readOnly
  );
  const winnerChevron = buildToggleField(
    'Winner chevron',
    !!cfg.winnerChevron,
    (v) => store.setConfigField('winnerChevron', v),
    readOnly
  );

  const rounded = buildToggleField(
    'Rounded corners',
    !!cfg.rounded,
    (v) => store.setConfigField('rounded', v),
    readOnly
  );

  const pathHighlight = buildToggleField(
    'Path highlight on hover',
    !!cfg.pathHighlight,
    (v) => store.setConfigField('pathHighlight', v),
    readOnly
  );

  const density = buildSelectField(
    'Density',
    [
      { value: '', label: 'Comfortable' },
      { value: 'compact', label: 'Compact' }
    ],
    cfg.density === 'compact' ? 'compact' : '',
    (v) => store.setConfigField('density', v === 'compact' ? 'compact' : undefined),
    readOnly
  );

  root.appendChild(scheduleInfo.element);
  root.appendChild(subgroup('Header', elapsed, eventRound, headerLayout));
  root.appendChild(roundHeader.element);
  root.appendChild(matchUpFooter.element);
  root.appendChild(centerInfo.element);
  root.appendChild(resultsInfo.element);
  root.appendChild(winnerChevron.element);
  root.appendChild(rounded.element);
  root.appendChild(pathHighlight.element);
  root.appendChild(density.element);
  root.appendChild(liveStatusPill.element);
  root.appendChild(subgroup('Actions', watchAction, shareAction));

  function update(state: CompositionEditorState): void {
    const c = state.configuration;
    scheduleInfo.setChecked(!!c.scheduleInfo);
    const header = headerOptionsOf(c.scheduleInfo);
    elapsed.setChecked(!!header.elapsed);
    eventRound.setChecked(!!header.eventRound);
    headerLayout.setValue(header.layout === 'inline' ? 'inline' : '');
    liveStatusPill.setChecked(c.liveStatusPill !== false);
    watchAction.setChecked(!!c.matchUpActions?.watch);
    shareAction.setChecked(!!c.matchUpActions?.share);
    roundHeader.setChecked(!!c.roundHeader);
    matchUpFooter.setChecked(!!c.matchUpFooter);
    centerInfo.setChecked(!!c.centerInfo);
    resultsInfo.setChecked(!!c.resultsInfo);
    winnerChevron.setChecked(!!c.winnerChevron);
    rounded.setChecked(!!c.rounded);
    pathHighlight.setChecked(!!c.pathHighlight);
    density.setValue(c.density === 'compact' ? 'compact' : '');
  }

  return { element: root, update };
}
