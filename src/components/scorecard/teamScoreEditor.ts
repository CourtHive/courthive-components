/**
 * Setting a dual's team score by hand, inline in the scorecard header. Override turns the two header scores into
 * fields; the higher score wins, and level scores show a winner choice. Save hands back the score by side number (for
 * the caller to record with automatic team scoring off); Cancel puts the header back. While the score is set by hand
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

const button = (text: string, action: string, primary?: boolean) => {
  const element = document.createElement('button');
  element.className = primary ? 'button is-small is-primary' : 'button is-small';
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
  const scoreBox = header.querySelector('.chc-scorecard-score-box') as HTMLElement;
  const spans = [...header.querySelectorAll<HTMLElement>('.chc-scorecard-side-score')];
  if (!scoreBox || spans.length !== 2) return;
  const names = [...header.querySelectorAll<HTMLElement>('.chc-scorecard-side-name')].map(
    (name, index) => name.textContent || String(index + 1)
  );

  const controls = document.createElement('div');
  controls.className = 'chc-scorecard-score-controls';
  scoreBox.appendChild(controls);

  if (teamScore.manual) {
    header.classList.add('chc-scorecard-header--manual');
    const tag = document.createElement('span');
    tag.className = 'chc-scorecard-manual-tag';
    tag.textContent = labels?.manual ?? 'Set by hand';
    controls.appendChild(tag);
    if (teamScore.onRestore) {
      const restore = button(labels?.restore ?? 'Restore automatic scoring', 'restore-team-score');
      restore.addEventListener('click', () => teamScore.onRestore?.());
      controls.appendChild(restore);
    }
  }
  if (!teamScore.onOverride) return;

  const set = matchUp?.score?.sets?.[0];
  const state = createTeamScoreOverride({
    side1Score: set?.side1Score ?? 0,
    side2Score: set?.side2Score ?? 0,
    winningSide: matchUp?.winningSide,
    swapSides
  });
  const override = button(labels?.override ?? 'Override', 'override-team-score');
  controls.appendChild(override);

  let isEditing = false;
  override.addEventListener('click', () => {
    if (!isEditing) {
      isEditing = true;
      openEditor({
        scoreBox,
        spans,
        names,
        controls,
        override,
        state,
        labels,
        onSave: teamScore.onOverride,
        onClose: () => {
          isEditing = false;
        }
      });
    }
  });
}

function openEditor({
  scoreBox,
  spans,
  names,
  controls,
  override,
  state,
  labels,
  onSave,
  onClose
}: {
  scoreBox: HTMLElement;
  spans: HTMLElement[];
  names: string[];
  controls: HTMLElement;
  override: HTMLElement;
  state: TeamScoreOverride;
  labels?: ScorecardLabels;
  onSave?: (teamScore: TeamScore) => void;
  onClose?: () => void;
}): void {
  override.hidden = true;
  const inputs = POSITIONS.map((position, index) => {
    const input = document.createElement('input');
    input.className = INPUT_CLASS;
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.dataset.position = position;
    input.value = String(state.scoreAt(position));
    input.setAttribute('aria-label', names[index]);
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
  winnerChoice.setAttribute('aria-label', labels?.winner ?? 'Winner');
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
  const save = button(labels?.save ?? 'Save', 'save-team-score', true);
  editor.append(winnerChoice, cancel, save);
  scoreBox.insertBefore(editor, controls);

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
    override.hidden = false;
    onClose?.();
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
