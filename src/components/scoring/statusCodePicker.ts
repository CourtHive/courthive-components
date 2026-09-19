/**
 * The reason-code control: "Retired — why?"
 *
 * Lives at the modal level rather than inside an approach. Every approach already reports its
 * outcome through one `onScoreChange`, and the code depends only on the resulting matchUpStatus —
 * not on how it was entered. One control therefore serves all four approaches, and they cannot
 * drift apart on it the way the double-exit rule did when each carried its own copy.
 *
 * It draws nothing unless the policy offers codes for the current status. That is the designed
 * quiet state, not a fallback: TMX ships no built-in vocabulary (CA, 2026-09-20), so the field
 * appears exactly where a governing body's policy is attached.
 */

import { statusCodeSubtext, statusCodeDisplay, codesForStatus } from './logic/statusCodes';
import type { StatusCodeGroups, StatusCodeEntry } from './logic/statusCodes';
import type { ScoringModalLabels } from './types';

const SELECT_ID = 'statusCodeSelectV2';

export type StatusCodePickerHandle = {
  element: HTMLElement;
  /** Re-render for a new status. Returns the code still selected, if any. */
  update: (matchUpStatus: string | undefined) => string | undefined;
  /** The chosen code, or undefined when none is chosen or none is offered. */
  getSelectedCode: () => string | undefined;
};

export function buildStatusCodePicker(params: {
  groups?: StatusCodeGroups;
  labels?: ScoringModalLabels;
}): StatusCodePickerHandle {
  const { groups, labels = {} } = params;

  const element = document.createElement('div');
  element.style.display = 'none';
  element.style.marginTop = '0.6em';

  const label = document.createElement('div');
  label.textContent = (labels.reasonCode || 'Reason') + ':';
  label.style.fontSize = '0.75rem';
  label.style.fontWeight = '500';
  label.style.marginBottom = '0.25em';
  label.style.color = 'var(--chc-text-primary)';
  element.appendChild(label);

  const select = document.createElement('select');
  select.id = SELECT_ID;
  select.className = 'input';
  select.style.fontSize = '0.8rem';
  select.style.width = '100%';
  // Native form controls do not inherit the theme; state both halves explicitly.
  select.style.backgroundColor = 'var(--chc-bg-primary)';
  select.style.color = 'var(--chc-text-primary)';
  select.style.border = '1px solid var(--chc-border-primary)';
  element.appendChild(select);

  const description = document.createElement('div');
  description.style.fontSize = '0.7rem';
  description.style.marginTop = '0.2em';
  description.style.color = 'var(--chc-text-secondary)';
  element.appendChild(description);

  let selectedCode: string | undefined;
  let offered: StatusCodeEntry[] = [];

  const describeSelection = () => {
    const entry = offered.find((e) => e.matchUpStatusCode === selectedCode);
    // `description` is the policy's long-form prose, which exists only on some codes.
    description.textContent = entry?.description ?? '';
    description.style.display = entry?.description ? 'block' : 'none';
  };

  select.addEventListener('change', () => {
    selectedCode = select.value || undefined;
    describeSelection();
  });

  const update = (matchUpStatus: string | undefined): string | undefined => {
    offered = codesForStatus(groups, matchUpStatus);

    if (!offered.length) {
      // Nothing to choose: hide the control AND drop any prior choice, so a code from a status the
      // operator has since changed away from cannot ride out on the submission.
      element.style.display = 'none';
      select.innerHTML = '';
      selectedCode = undefined;
      describeSelection();
      return undefined;
    }

    // A code already chosen stays chosen only if the new status still offers it — switching
    // Retired → Defaulted must not keep "Ret [inj]".
    if (selectedCode && !offered.some((entry) => entry.matchUpStatusCode === selectedCode)) {
      selectedCode = undefined;
    }

    select.innerHTML = '';

    const none = document.createElement('option');
    none.value = '';
    none.textContent = labels.noReasonCode || 'No reason given';
    select.appendChild(none);

    for (const entry of offered) {
      const option = document.createElement('option');
      option.value = entry.matchUpStatusCode;
      const subtext = statusCodeSubtext(entry);
      option.textContent = subtext ? `${statusCodeDisplay(entry)} — ${subtext}` : statusCodeDisplay(entry);
      select.appendChild(option);
    }

    select.value = selectedCode ?? '';
    element.style.display = 'block';
    describeSelection();

    return selectedCode;
  };

  return { element, update, getSelectedCode: () => selectedCode };
}
