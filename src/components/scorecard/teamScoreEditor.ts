/**
 * Setting a dual's team score by hand, inline in the scorecard header. Override turns the two header scores into
 * fields; the higher score wins, and level scores show a winner choice. Save hands back the score by side number (for
 * the caller to record with automatic team scoring off); Cancel puts the header back. The controls sit in their own
 * row under the names and scores, and the open editor replaces them there. While the score is set by hand
 * the header says so, and Restore hands the dual back to automatic scoring.
 *
 * The editing rules live in the team-score override state; this only renders them.
 */
import {
  createTeamScoreOverride,
  type Position,
  type TeamScore,
  type TeamScoreOverride
} from './teamScoreOverrideState';
import type { ScorecardLabels } from './renderCollectionCard';

export interface TeamScoreOptions {
  /** the score is set by hand (automatic team scoring is off) */
  manual?: boolean;
  /** offered when given: the header's scores become editable */
  onOverride?: (teamScore: TeamScore) => void;
  /** offered while `manual`: hand the dual back to automatic scoring */
  onRestore?: () => void;
}

const INPUT_CLASS = 'chc-scorecard-score-input';
const POSITIONS: Position[] = ['left', 'right'];

// the library's own buttons (renderButtons, cModal): `button font-medium`, an intent where the action has one
const button = (text: string, action: string, intent?: string) => {
  const element = document.createElement('button');
  element.className = 'button font-medium';
  if (intent) element.classList.add(...intent.split(' '));
  element.textContent = text;
  element.dataset.action = action;
  return element;
};

export function attachTeamScoreEditor({
  header,
  matchUp,
  swapSides,
  teamScore,
  labels
}: {
  header: HTMLElement;
  matchUp: any;
  swapSides?: boolean;
  teamScore: TeamScoreOptions;
  labels?: ScorecardLabels;
}): void {
  const spans = [...header.querySelectorAll<HTMLElement>('.chc-scorecard-side-score')];
  if (spans.length !== 2) return;
  const names = [...header.querySelectorAll<HTMLElement>('.chc-scorecard-side-name')].map(
    (name, index) => name.textContent || String(index + 1)
  );

  // a row of its own under the names and scores, so opening the editor never moves them
  const controls = document.createElement('div');
  controls.className = 'chc-scorecard-score-controls';
  header.appendChild(controls);

  if (teamScore.manual) {
    header.classList.add('chc-scorecard-header--manual');
    const tag = document.createElement('span');
    tag.className = 'chc-scorecard-manual-tag';
    tag.textContent = labels?.manual ?? 'Set by hand';
    controls.appendChild(tag);
    if (teamScore.onRestore) {
      const restore = button(labels?.restore ?? 'Restore automatic scoring', 'restore-team-score', 'is-info is-light');
      restore.addEventListener('click', () => teamScore.onRestore?.());
      controls.appendChild(restore);
    }
  }
  if (!teamScore.onOverride) {
    if (!controls.childElementCount) controls.remove();
    return;
  }

  const set = matchUp?.score?.sets?.[0];
  const state = createTeamScoreOverride({
    side1Score: set?.side1Score ?? 0,
    side2Score: set?.side2Score ?? 0,
    winningSide: matchUp?.winningSide,
    swapSides
  });
  const override = button(labels?.override ?? 'Override', 'override-team-score', 'is-warning is-light');
  controls.appendChild(override);
  override.addEventListener('click', () =>
    openEditor({ header, spans, names, controls, state, labels, onSave: teamScore.onOverride })
  );
}

function openEditor({
  header,
  spans,
  names,
  controls,
  state,
  labels,
  onSave
}: {
  header: HTMLElement;
  spans: HTMLElement[];
  names: string[];
  controls: HTMLElement;
  state: TeamScoreOverride;
  labels?: ScorecardLabels;
  onSave?: (teamScore: TeamScore) => void;
}): void {
  header.classList.add('chc-scorecard-header--editing');
  // while the editor is open it is the only control: the override, restore and tag come back when it closes
  controls.hidden = true;
  const inputs = POSITIONS.map((position, index) => {
    const input = document.createElement('input');
    input.className = INPUT_CLASS;
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = '0';
    input.step = '1';
    input.dataset.position = position;
    input.value = String(state.scoreAt(position));
    input.setAttribute('aria-label', names[index]);
    input.addEventListener('focus', () => input.select());
    // a value that is not a score is put back
    input.addEventListener('change', () => {
      if (!state.setScore(position, Number(input.value))) input.value = String(state.scoreAt(position));
      update();
    });
    spans[index].hidden = true;
    spans[index].after(input);
    return input;
  });

  const editor = document.createElement('div');
  editor.className = 'chc-scorecard-score-editor';
  const winnerChoice = document.createElement('div');
  winnerChoice.className = 'chc-scorecard-winner-choice';
  winnerChoice.setAttribute('role', 'group');
  const winnerLabel = labels?.winner ?? 'Winner';
  winnerChoice.setAttribute('aria-label', winnerLabel);
  const prompt = document.createElement('span');
  prompt.className = 'chc-scorecard-winner-prompt';
  prompt.textContent = winnerLabel;
  winnerChoice.appendChild(prompt);
  const choices = POSITIONS.map((position, index) => {
    const choice = button(names[index], 'choose-winner');
    choice.dataset.position = position;
    choice.addEventListener('click', () => {
      state.chooseWinner(position);
      update();
    });
    winnerChoice.appendChild(choice);
    return choice;
  });
  const cancel = button(labels?.cancel ?? 'Cancel', 'cancel-team-score');
  const save = button(labels?.save ?? 'Save', 'save-team-score', 'is-info');
  const actions = document.createElement('div');
  actions.className = 'chc-scorecard-score-actions';
  actions.append(cancel, save);
  editor.append(winnerChoice, actions);
  controls.after(editor);
  inputs[0].focus();

  function update() {
    winnerChoice.hidden = !state.needsWinner();
    const winner = state.winnerAt();
    choices.forEach((choice) => choice.setAttribute('aria-pressed', String(choice.dataset.position === winner)));
    save.disabled = !state.isValid() || !state.isDirty();
  }
  update();

  const close = () => {
    inputs.forEach((input) => input.remove());
    spans.forEach((span) => (span.hidden = false));
    editor.remove();
    controls.hidden = false;
    header.classList.remove('chc-scorecard-header--editing');
  };
  cancel.addEventListener('click', () => {
    state.reset();
    close();
  });
  save.addEventListener('click', () => {
    const value = state.value();
    // the header shows what was saved until the caller renders the recorded dual
    POSITIONS.forEach((position, index) => (spans[index].textContent = String(state.scoreAt(position))));
    close();
    onSave?.(value);
  });
}
