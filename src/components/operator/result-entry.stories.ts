import './resultPreview.css';
import { operatorMatchFixture, operatorDetails, operatorDayFrame } from './fixtures';
import { createResultPreview } from './result.stories.model';
import { user } from '../../stories/helpers/trustedUser';
import { expect, within, waitFor } from 'storybook/test';
import { createOperatorStatus } from './status';
import { renderOperatorMatch } from './render';
import {
  readCell,
  enteredSets,
  scoreString,
  winningSide,
  matchUpStatus
} from 'tods-competition-factory/score-entry-state';

// constants and types
import type { PreviewReceipt, PreviewDocument } from './result.stories.model';
import type { CellRef } from 'tods-competition-factory/score-entry-state';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = { title: 'Operator/Result entry preview', parameters: { layout: 'padded' } };
export default meta;
const ARIA_LABEL = 'aria-label';
const RECORD = 'Record result';
const SAVE = 'Save result';
const CHECK = 'Check command';
const ACCEPT = 'Accept command';
const PUBLISH = 'Publish updated view';
const SIMULATION = 'Simulated services — no CFS/query request is sent. Acceptance is not projection readiness.';
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: () => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = () => fail();
  });
  return { promise, resolve, reject };
}
function preview() {
  const host = document.createElement('section');
  const note = document.createElement('p');
  note.textContent = SIMULATION;
  const cardHost = document.createElement('div');
  cardHost.append(
    renderOperatorMatch(
      {
        ...operatorMatchFixture,
        status: 'TO_BE_PLAYED',
        scoreText: '',
        hasScore: false,
        sides: operatorMatchFixture.sides.map((side) => ({ ...side, isWinner: false }))
      },
      { dayFrame: operatorDayFrame, details: { 'example-semifinal': { title: 'Open singles — Semifinal' } } }
    )
  );
  const open = document.createElement('button');
  open.textContent = RECORD;
  open.type = 'button';
  const status = createOperatorStatus(undefined, operatorDayFrame);
  const dialog = document.createElement('dialog');
  dialog.setAttribute(ARIA_LABEL, RECORD);
  dialog.className = 'chc-result-preview';
  const heading = document.createElement('h2');
  heading.textContent = RECORD;
  const form = document.createElement('form');
  const save = document.createElement('button');
  save.textContent = SAVE;
  save.type = 'submit';
  const check = document.createElement('button');
  check.textContent = CHECK;
  check.type = 'button';
  const close = document.createElement('button');
  close.textContent = 'Close';
  close.type = 'button';
  let result = deferred<PreviewReceipt>();
  let projection = deferred<PreviewDocument>();
  let published = operatorMatchFixture;
  let publishedDetails = operatorDetails;
  let count = 0;
  let receiptCount = 0;
  const receiptIds: string[] = [];
  const receiptLog = globalThis.document.createElement('p');
  receiptLog.setAttribute(ARIA_LABEL, 'Command evidence');
  const controller = createResultPreview(
    {
      commandId: () => 'preview-command-' + ++count,
      send: async () => {
        result = deferred<PreviewReceipt>();
        return result.promise;
      },
      receipt: async (id) => {
        receiptIds.push(id);
        receiptCount++;
        return { kind: 'accepted', revision: 2 };
      },
      read: async () => {
        projection = deferred<PreviewDocument>();
        return projection.promise;
      }
    },
    { matchUpId: operatorMatchFixture.matchUpId, allowed: true, rules: { disabledMatchUpStatuses: [] } }
  );
  const inputs: { cell: CellRef; input: HTMLInputElement }[] = [];
  const table = globalThis.document.createElement('table');
  const tableHead = globalThis.document.createElement('thead');
  const headerRow = globalThis.document.createElement('tr');
  for (const text of ['Player', 'Set 1', 'Set 2']) {
    const cell = globalThis.document.createElement('th');
    cell.scope = 'col';
    cell.textContent = text;
    headerRow.append(cell);
  }
  tableHead.append(headerRow);
  table.append(tableHead);
  const body = globalThis.document.createElement('tbody');
  for (const side of [1, 2] as const) {
    const name = operatorMatchFixture.sides.find((item) => item.sideNumber === side)!.name!;
    const row = globalThis.document.createElement('tr');
    const heading = globalThis.document.createElement('th');
    heading.scope = 'row';
    heading.textContent = name;
    row.append(heading);
    for (const setIndex of [0, 1]) {
      const holder = globalThis.document.createElement('td');
      const input = globalThis.document.createElement('input');
      input.setAttribute(ARIA_LABEL, `Set ${setIndex + 1} · ${name}`);
      input.inputMode = 'numeric';
      input.pattern = '[0-9]*';
      input.type = 'text';
      const cell: CellRef = { setIndex, side, kind: 'games' };
      input.addEventListener('input', () =>
        controller.edit(cell, input.value === '' ? undefined : Number(input.value))
      );
      holder.append(input);
      row.append(holder);
      inputs.push({ cell, input });
    }
    body.append(row);
  }
  table.append(body);
  form.append(table);
  const problem = globalThis.document.createElement('p');
  problem.setAttribute('role', 'status');
  form.append(save);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    controller.save();
  });
  check.addEventListener('click', () => {
    controller.recover();
  });
  open.addEventListener('click', () => {
    dialog.insertBefore(status.element, form);
    dialog.showModal();
    inputs[0].input.focus();
  });
  close.addEventListener('click', () => {
    dialog.close();
  });
  dialog.addEventListener('close', () => {
    host.insertBefore(status.element, cardHost);
    if (controller.snapshot().stage === 'current') cardHost.querySelector<HTMLElement>('article')?.focus();
    else open.focus();
  });
  dialog.append(heading, form, problem, check, close);
  const controls = globalThis.document.createElement('fieldset');
  const legend = globalThis.document.createElement('legend');
  legend.textContent = 'Simulation controls';
  controls.append(legend);
  const simulationButtons = new Map<string, HTMLButtonElement>();
  function control(label: string, action: () => void) {
    const button = globalThis.document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', action);
    controls.append(button);
    simulationButtons.set(label, button);
  }
  control(ACCEPT, () => result.resolve({ kind: 'accepted', revision: 2 }));
  control('Refuse command', () => result.resolve({ kind: 'refused' }));
  control('Lose acknowledgment', () => result.reject());
  control(PUBLISH, () => {
    // This is a fixture producer for the simulated read, not optimistic app state.
    // All score/winner facts come from the released canonical score-state selectors.
    const model = controller.snapshot().model;
    published = {
      ...operatorMatchFixture,
      scoreText: scoreString(model),
      status: matchUpStatus(model),
      sides: operatorMatchFixture.sides.map((side) => ({ ...side, isWinner: winningSide(model) === side.sideNumber }))
    };
    publishedDetails = {
      'example-semifinal': {
        ...operatorDetails['example-semifinal'],
        scoreColumns: enteredSets(model).map((set, index) => ({
          label: `Set ${index + 1}`,
          side1: String(set.side1Score ?? ''),
          side2: String(set.side2Score ?? '')
        }))
      }
    };
    projection.resolve({ revision: 2, matchUpId: operatorMatchFixture.matchUpId });
  });
  controller.subscribe(() => {
    const state = controller.snapshot();
    for (const [label, button] of simulationButtons)
      button.disabled = label === PUBLISH ? state.stage !== 'projection-pending' : state.stage !== 'saving';
    save.disabled = !state.canSave;
    check.hidden = state.stage !== 'outcome-unknown';
    check.disabled = state.checking;
    for (const { cell, input } of inputs) {
      input.disabled = !state.editable;
      input.value = String(readCell(state.model.sets[cell.setIndex], cell) ?? '');
    }
    const freshness = state.stage === 'editing' ? 'unverified' : state.stage;
    status.update({ access: 'operator', freshness });
    problem.textContent =
      state.stage === 'refused'
        ? 'The result was refused. Review it before saving again.'
        : state.stage === 'outcome-unknown'
          ? 'Do not submit again. Check the original command.'
          : '';
    receiptLog.textContent = JSON.stringify({ sends: count, checks: receiptCount, receiptIds });
    if (state.stage === 'current') {
      dialog.close();
      open.hidden = true;
      const saved = renderOperatorMatch(published, { details: publishedDetails, dayFrame: operatorDayFrame });
      saved.tabIndex = -1;
      cardHost.replaceChildren(saved);
    }
  });
  // Simulation buttons remain inside the modal so genuine browser input can operate them while it is open.
  dialog.append(controls);
  host.append(note, status.element, cardHost, open, dialog, receiptLog);
  return host;
}
async function enter(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await user.click(canvas.getByRole('button', { name: RECORD }));
  for (const [label, value] of [
    ['Set 1 · Alex Morgan', '6'],
    ['Set 1 · Sam Rivera', '4'],
    ['Set 2 · Alex Morgan', '6'],
    ['Set 2 · Sam Rivera', '3']
  ])
    await user.fill(canvas.getByLabelText(label), value);
  await user.click(canvas.getByRole('button', { name: SAVE }));
  await waitFor(() => expect(canvas.getAllByRole('status')[0]).toHaveTextContent('Saving'));
}
export const ResultEntry: StoryObj = { name: 'Record a result (interactive)', render: preview };

export const SaveThenRefresh: StoryObj = {
  tags: ['!dev'],
  render: preview,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await enter(canvasElement);
    await user.click(canvas.getByRole('button', { name: ACCEPT }));
    await waitFor(() => expect(canvas.getAllByRole('status')[0]).toHaveTextContent('Saved · updating views'));
    expect(canvas.getByRole('dialog')).toBeVisible();
    expect(canvas.getByRole('button', { name: SAVE })).toBeDisabled();
    await user.click(canvas.getByRole('button', { name: PUBLISH }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    expect(canvasElement.querySelector('.chc-operator-status')).toHaveTextContent('Up to date');
    expect(canvasElement.querySelectorAll('.spl-card-score-cell')).toHaveLength(4);
  }
};
export const RefusedResult: StoryObj = {
  tags: ['!dev'],
  render: preview,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await enter(canvasElement);
    await user.click(canvas.getByRole('button', { name: 'Refuse command' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: SAVE })).toBeEnabled());
    expect(canvas.getByRole('dialog')).toBeVisible();
    expect(canvas.getByLabelText('Set 1 · Alex Morgan')).toHaveValue('6');
    await user.fill(canvas.getByLabelText('Set 1 · Sam Rivera'), '2');
    await user.click(canvas.getByRole('button', { name: SAVE }));
    await user.click(canvas.getByRole('button', { name: ACCEPT }));
    await user.click(canvas.getByRole('button', { name: PUBLISH }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    expect(canvas.getByLabelText('Set 1: 2')).toBeVisible();
  }
};
export const UnknownOutcomeRecovery: StoryObj = {
  tags: ['!dev'],
  render: preview,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await enter(canvasElement);
    await user.click(canvas.getByRole('button', { name: 'Lose acknowledgment' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: CHECK })).toBeVisible());
    expect(canvas.getByRole('button', { name: SAVE })).toBeDisabled();
    await user.click(canvas.getByRole('button', { name: CHECK }));
    await user.click(canvas.getByRole('button', { name: PUBLISH }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    expect(canvas.getByLabelText('Command evidence')).toHaveTextContent(
      '"sends":1,"checks":1,"receiptIds":["preview-command-1"]'
    );
  }
};
