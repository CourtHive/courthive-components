import './resultPreview.css';
import { operatorMatchFixture, operatorDetails, operatorDayFrame } from './fixtures';
import { openScoreEntryDialog } from '../scoring/scoreEntryDialog';
import { createResultPreview } from './result.stories.model';
import { user } from '../../stories/helpers/trustedUser';
import { expect, within, waitFor } from 'storybook/test';
import { createOperatorStatus } from './status';
import { renderOperatorMatch } from './render';
import {
  enteredSets,
  scoreString,
  winningSide,
  matchUpStatus,
  matchUpConfigFor,
  getSetFormatForIndex,
  isSetTiebreakOnly
} from 'tods-competition-factory/score-entry-state';

// constants and types
import type { PreviewReceipt, PreviewDocument } from './result.stories.model';
import type { ScoreEntryDialog } from '../scoring/scoreEntryDialog';
import type { Meta, StoryObj } from '@storybook/html-vite';

let disposePreview = () => {};
const meta: Meta = {
  title: 'Operator/Result entry preview',
  parameters: { layout: 'padded' },
  beforeEach: () => () => disposePreview()
};
export default meta;
const ARIA_LABEL = 'aria-label';
const STATUS = '.chc-operator-status';
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
  disposePreview();
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
  let dialog: ScoreEntryDialog | undefined;
  let pendingSubmit: ReturnType<typeof deferred<unknown>> | undefined;
  const check = document.createElement('button');
  check.textContent = CHECK;
  check.type = 'button';
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
  check.addEventListener('click', () => controller.recover());
  open.addEventListener('click', () => {
    dialog = openScoreEntryDialog({
      title: RECORD,
      context: 'Open singles · Semifinal · Court 3 · America/New_York',
      matchUpFormat: controller.snapshot().model.matchUpFormat,
      sets: enteredSets(controller.snapshot().model),
      sides: [{ participantName: 'Alex Morgan' }, { participantName: 'Sam Rivera' }],
      labels: { submit: SAVE },
      disabledMatchUpStatuses: [],
      onFormatChange: () => {},
      onScoreDiscarded: () => {
        notice.textContent = 'The format change discarded incompatible score entries. Review the score.';
      },
      onSubmit: () => {
        controller.replaceModel(dialog!.card.getModel());
        pendingSubmit = deferred<unknown>();
        controller.save();
        return pendingSubmit.promise;
      },
      onClose: () => {
        host.append(status.element, check, controls);
        dialog = undefined;
        (controller.snapshot().stage === 'current' ? cardHost.querySelector<HTMLElement>('article') : open)?.focus();
      }
    });
    dialog.card.element.after(status.element, notice, check, controls);
  });
  const notice = document.createElement('p');
  notice.setAttribute('role', 'status');
  notice.className = 'chc-result-preview-notice';
  const controls = globalThis.document.createElement('fieldset');
  const legend = globalThis.document.createElement('legend');
  legend.textContent = 'Simulation controls';
  controls.append(legend);
  controls.className = 'chc-result-preview-controls';
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
        scoreColumns: enteredSets(model).map((set, index) => {
          const points = isSetTiebreakOnly(getSetFormatForIndex(index, matchUpConfigFor(model.matchUpFormat)));
          return {
            label: `Set ${index + 1}`,
            side1: String((points ? set.side1TiebreakScore : set.side1Score) ?? ''),
            side2: String((points ? set.side2TiebreakScore : set.side2Score) ?? '')
          };
        })
      }
    };
    projection.resolve({ revision: 2, matchUpId: operatorMatchFixture.matchUpId });
  });
  controller.subscribe(() => {
    const state = controller.snapshot();
    for (const [label, button] of simulationButtons)
      button.disabled = label === PUBLISH ? state.stage !== 'projection-pending' : state.stage !== 'saving';
    open.disabled = !state.editable;
    if (dialog) dialog.card.element.inert = !state.editable;
    check.hidden = state.stage !== 'outcome-unknown';
    check.disabled = state.checking;
    const freshness = state.stage === 'editing' ? 'unverified' : state.stage;
    status.update({ access: 'operator', freshness });
    notice.textContent = state.stage === 'outcome-unknown' ? 'Do not submit again. Check the original command.' : '';
    if (state.stage === 'refused') {
      pendingSubmit?.resolve({ error: 'The result was refused. Review it before saving again.' });
      pendingSubmit = undefined;
    }
    receiptLog.textContent = JSON.stringify({ sends: count, checks: receiptCount, receiptIds });
    if (state.stage === 'current') {
      open.hidden = true;
      const saved = renderOperatorMatch(published, { details: publishedDetails, dayFrame: operatorDayFrame });
      saved.tabIndex = -1;
      cardHost.replaceChildren(saved);
      pendingSubmit?.resolve(undefined);
      pendingSubmit = undefined;
    }
  });
  host.append(note, status.element, cardHost, open, check, controls, receiptLog);
  disposePreview = () => {
    controller.destroy();
    dialog?.close();
  };
  return host;
}
const modal = () => within(document.body).getByRole('dialog');
const entry = (side: number, set: number) =>
  modal().querySelector<HTMLInputElement>(`input[data-side="${side}"][data-set="${set}"]`)!;
async function enter(canvasElement: HTMLElement) {
  await user.click(within(canvasElement).getByRole('button', { name: RECORD }));
  expect(modal().querySelector('[data-action="smartComplements"]')).toHaveAttribute('aria-pressed', 'true');
  // Smart supplies 6 against the typed loser's score and the canonical model reveals the next set.
  await user.fill(entry(2, 1), '4');
  await user.fill(entry(2, 2), '3');
  await user.click(within(modal()).getByRole('button', { name: SAVE }));
  await waitFor(() => expect(modal().querySelector(STATUS)).toHaveTextContent('Saving'));
}
export const ResultEntry: StoryObj = { name: 'Record a result (interactive)', render: preview };

export const SaveThenRefresh: StoryObj = {
  tags: ['!dev'],
  render: preview,
  play: async ({ canvasElement }) => {
    const canvas = within(document.body);
    await enter(canvasElement);
    await user.click(canvas.getByRole('button', { name: ACCEPT }));
    await waitFor(() => expect(document.querySelector(STATUS)).toHaveTextContent('Saved · updating views'));
    expect(canvas.getByRole('dialog')).toBeVisible();
    expect(modal().querySelector('button[data-action="submit"]')).toBeDisabled();
    expect(modal().querySelector('[data-component="scoreEntryCard"]')).toHaveAttribute('inert');
    await user.click(canvas.getByRole('button', { name: PUBLISH }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    expect(canvasElement.querySelector(STATUS)).toHaveTextContent('Up to date');
    expect(canvasElement.querySelectorAll('.spl-card-score-cell')).toHaveLength(4);
  }
};
export const RefusedResult: StoryObj = {
  tags: ['!dev'],
  render: preview,
  play: async ({ canvasElement }) => {
    const canvas = within(document.body);
    await enter(canvasElement);
    await user.click(canvas.getByRole('button', { name: 'Refuse command' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: SAVE })).toBeEnabled());
    expect(canvas.getByRole('dialog')).toBeVisible();
    await user.click(modal().querySelector<HTMLElement>('button[data-done-side="2"][data-done-set="1"]')!);
    expect(entry(1, 1)).toHaveValue('6');
    await user.fill(entry(2, 1), '2');
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
    const canvas = within(document.body);
    await enter(canvasElement);
    await user.click(canvas.getByRole('button', { name: 'Lose acknowledgment' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: CHECK })).toBeVisible());
    expect(modal().querySelector('button[data-action="submit"]')).toBeDisabled();
    expect(modal().querySelector('[data-component="scoreEntryCard"]')).toHaveAttribute('inert');
    await user.click(canvas.getByRole('button', { name: CHECK }));
    await user.click(canvas.getByRole('button', { name: PUBLISH }));
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    expect(canvas.getByLabelText('Command evidence')).toHaveTextContent(
      '"sends":1,"checks":1,"receiptIds":["preview-command-1"]'
    );
  }
};

export const MobileSmartAndFormat: StoryObj = {
  tags: ['!dev'],
  render: preview,
  play: async ({ canvasElement }) => {
    const original = { width: innerWidth, height: innerHeight };
    try {
      await user.viewport(320, 740);
      await user.click(within(canvasElement).getByRole('button', { name: RECORD }));
      expect(entry(2, 1)).toHaveFocus();
      await user.fill(entry(2, 1), '4');
      expect(entry(1, 1)).toHaveValue('6');
      expect(entry(2, 2)).toBeVisible();
      await user.click(modal().querySelector<HTMLElement>('[data-action="editFormat"]')!);
      const picker = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].at(-1)!;
      await user.selectOptions(
        picker.querySelector<HTMLSelectElement>('#matchUpFormatSelector')!,
        'SET3-S:6NOAD/TB7-F:TB10'
      );
      await user.click(within(picker).getByRole('button', { name: /^Select$/ }));
      await waitFor(() => expect(within(document.body).getAllByRole('dialog')).toHaveLength(1));
      expect(modal().querySelector('[data-action="editFormat"]')).toHaveTextContent('SET3-S:6NOAD/TB7-F:TB10');
      await user.fill(entry(1, 2), '4');
      await user.fill(entry(2, 3), '8');
      expect(entry(1, 3)).toHaveValue('10');
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth);
      expect(modal().scrollWidth).toBeLessThanOrEqual(modal().clientWidth);
      await user.click(within(modal()).getByRole('button', { name: SAVE }));
      await user.click(within(modal()).getByRole('button', { name: ACCEPT }));
      await user.click(within(modal()).getByRole('button', { name: PUBLISH }));
      await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull());
      expect(within(canvasElement).getByLabelText('Set 3: 10')).toBeVisible();
      expect(within(canvasElement).getByLabelText('Set 3: 8')).toBeVisible();
    } finally {
      await user.viewport(original.width, original.height);
    }
  }
};
