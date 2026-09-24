/**
 * A recorded reason survives re-opening the scoring dialog.
 *
 * Reported from a live demo (CA, 2026-09-24) on the Reason Codes Invitational: a reason could be
 * submitted, but re-opening the dialog showed the control on "none". Saving again then dropped the
 * reason, because the modal returns whatever the control currently holds.
 *
 * The value was never lost from the record — verified against the factory, `setMatchUpStatus` with
 * `matchUpStatusCodes: ['RJ']` reads straight back as `["RJ"]`. The dialog simply never read it:
 * `buildStatusCodePicker` started `selectedCode` at `undefined` and only user interaction set it.
 *
 * Note the name collision this sits on, which is why it was easy to miss: the modal's
 * `matchUpStatusCodes` PARAMETER is the policy's vocabulary, while `matchUp.matchUpStatusCodes` is
 * what this matchUp recorded. The factory's own type comments flag the same conflation.
 */
import { matchUpStatusConstants, fixtures, policyConstants } from 'tods-competition-factory';
import { expect, userEvent } from 'storybook/test';

import { scoringModal } from '../components/scoring/scoringModal';
import { setScoringConfig } from '../components/scoring/config';

const { RETIRED } = matchUpStatusConstants;
const { POLICY_TYPE_SCORING } = policyConstants;

const GROUPS = fixtures.policies.POLICY_SCORING_USTA[POLICY_TYPE_SCORING].matchUpStatusCodes as any;

const RECORDED_CODE = 'RJ'; // "Ret [inj]" — a real entry in the shipped USTA vocabulary

const matchUpWithRecordedReason = () => ({
  matchUpId: 'reason-round-trip-1',
  matchUpStatus: RETIRED,
  matchUpStatusCodes: [RECORDED_CODE],
  winningSide: 1,
  score: { sets: [{ setNumber: 1, side1Score: 6, side2Score: 2, winningSide: 1 }], scoreStringSide1: '6-2 Ret.' },
  sides: [
    { sideNumber: 1, participant: { participantName: 'A. Player' } },
    { sideNumber: 2, participant: { participantName: 'B. Player' } }
  ]
});

export default {
  title: 'Components/Scoring/Reason Code Round Trip',
  tags: ['autodocs']
};

export const ReopensWithTheRecordedReason = {
  render: () => {
    const container = document.createElement('div');
    container.style.cssText = 'padding:12px;';

    const note = document.createElement('div');
    note.style.cssText = 'font-size:0.85rem; margin-bottom:10px; color: var(--chc-text-secondary);';
    note.textContent = `This matchUp already records reason "${RECORDED_CODE}" (Ret [inj]). Opening the dialog must show it.`;

    const button = document.createElement('button');
    // `.button.is-info` is THIS library's own class (src/styles/components/buttons.css), themed via
    // --chc-* custom properties. It is Bulma-SHAPED naming, but Bulma is not a dependency and there
    // are no --bulma-* variables anywhere in it — so the ecosystem's no-Bulma rule does not apply.
    // Hand-rolled inline styles here lost the hover, active and focus states the class carries.
    button.className = 'button is-info';
    button.id = 'openScoringDialog';
    button.textContent = 'Open scoring dialog';
    button.onclick = () => {
      setScoringConfig({ scoringApproach: 'freeScore' });
      scoringModal({
        matchUp: matchUpWithRecordedReason(),
        matchUpStatusCodes: GROUPS,
        callback: () => undefined
      });
    };

    container.appendChild(note);
    container.appendChild(button);
    return container;
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const button = canvasElement.querySelector('#openScoringDialog') as HTMLElement;
    await expect(button).toBeTruthy();
    await userEvent.click(button);

    // The modal mounts to document.body, not into the story canvas.
    const select = document.querySelector('#statusCodeSelectV2') as HTMLSelectElement | null;
    await expect(select).toBeTruthy();

    // The control is only drawn when a vocabulary is attached; it must also be VISIBLE, since a
    // hidden control holding the right value would still read as "no reason" to a director.
    await expect((select as HTMLSelectElement).closest('div')?.parentElement?.style.display).not.toBe('none');

    // The assertion that fails without the fix: it opened on '' (none).
    const sel = select as HTMLSelectElement;

    // The vocabulary must actually be offered — a control showing the right value but no
    // alternatives would mean the status context never resolved.
    await expect(sel.options.length).toBeGreaterThan(1);

    // The assertion that fails without the fix: it opened on '' (none).
    await expect(sel.value).toBe(RECORDED_CODE);
  }
};
