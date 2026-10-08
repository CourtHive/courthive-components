// @vitest-environment happy-dom
/**
 * The format picker as the score-entry dialog needs it — CA, 2026-10-08, a screenshot of the picker over
 * the score-entry dialog: the dialog stayed live under it, and the picker's red tiebreak toggle and blue
 * Select clashed with the dialog's teal.
 *
 *  - `onClose` fires however the picker closes, so a host that locked itself while the picker was open
 *    (the score-entry dialog sets `inert`) always gets itself back. Cancel and Select both close it.
 *  - the picker carries `chc-mfc-modal`, which scopes its accent rules, and no toggle is `is-danger`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMatchUpFormatModal } from '../matchUpFormat';
import { cModal } from '../../modal/cmodal';

const MODAL = 'section[id^="cmdl-"]';
const FORMAT = 'SET3-S:6/TB7';

const footerButton = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('.chc-modal-footer button')].find(
    (button) => button.textContent?.trim() === label
  );

afterEach(() => {
  for (let attempt = 0; attempt < 4 && document.querySelector(MODAL); attempt += 1) cModal.close();
});

describe('the format picker reports its close', () => {
  it.each(['Cancel', 'Select'])('calls onClose when %s closes it', (label) => {
    const onClose = vi.fn();
    const callback = vi.fn();
    getMatchUpFormatModal({ existingMatchUpFormat: FORMAT, callback, onClose });
    expect(footerButton(label), `control: a ${label} button is rendered`).toBeTruthy();

    footerButton(label)!.click();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector(MODAL)).toBeNull();
  });
});

describe('the format picker is styled with the score entry', () => {
  it('carries the scoping class for its accent rules', () => {
    getMatchUpFormatModal({ existingMatchUpFormat: FORMAT });

    expect(document.querySelector('.chc-modal-dialog.chc-mfc-modal')).toBeTruthy();
  });

  it('has no red toggle', () => {
    getMatchUpFormatModal({ existingMatchUpFormat: FORMAT });

    expect(document.querySelectorAll('.chc-mfc-modal .switch').length, 'control: toggles are rendered').toBeGreaterThan(
      0
    );
    expect(document.querySelector('.chc-mfc-modal .switch.is-danger')).toBeNull();
  });
});
