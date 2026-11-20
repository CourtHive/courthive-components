import { openScoreEntryDialog } from 'courthive-components/score-entry';
import { createHost } from './model.js';
import 'courthive-components/score-entry.css';
import './theme.css';
import type {
  ScoreEntryDialog,
  ScoreEntryDialogParams,
  ScoreEntryApproach,
  MatchUpFormatConfig
} from 'courthive-components/score-entry';

const theme = new URLSearchParams(location.search).get('theme');
document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
const host = createHost();
const launch = document.querySelector<HTMLButtonElement>('#open')!;
const evidence = document.querySelector<HTMLOutputElement>('#evidence')!;
let dialog: ScoreEntryDialog | undefined;
const controls = document.createElement('fieldset');
const legend = document.createElement('legend');
legend.textContent = 'Simulated services';
controls.append(legend);
for (const [label, action] of Object.entries({
  Accept: host.accept,
  Refuse: host.refuse,
  'Lose acknowledgment': host.lose,
  'Check command': host.recover,
  Publish: host.publish
})) {
  const button = document.createElement('button');
  button.textContent = label;
  button.type = 'button';
  button.addEventListener('click', action);
  controls.append(button);
}
// Compile the exported host types through the installed declaration graph.
const approach: ScoreEntryApproach = 'dynamicSets';
const picker: MatchUpFormatConfig = { labels: { select: 'Select' } };
void picker;
const params: ScoreEntryDialogParams = {
  title: 'Record result',
  sides: [{ participantName: 'Ann Example' }, { participantName: 'Bea Example' }],
  matchUpFormat: 'SET3-S:6/TB7',
  context: 'Court 1 · America/New_York',
  approach,
  onFormatChange: () => {},
  onSubmit: ({ outcome }) => host.submit(outcome),
  onClose: () => {
    dialog = undefined;
    launch.focus();
  }
};
launch.addEventListener('click', () => {
  dialog = openScoreEntryDialog(params);
  dialog.card.element.after(controls);
});
host.subscribe(() => {
  const state = host.snapshot();
  evidence.textContent = JSON.stringify(state);
  if (dialog) dialog.card.element.inert = !['editing', 'refused'].includes(state.phase);
});
