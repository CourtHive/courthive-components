import { openScoreEntryDialog } from './scoreEntryDialog';
import { cModal } from '../modal/cmodal';
import { expect } from 'storybook/test';

export default { title: 'Scoring/Status Scope' };

const MODAL = 'section[id^="cmdl-"]';
const SUBMIT = 'button[data-action="submit"]';
const DEAD_OPTION = '[data-ending="DEAD_RUBBER"]';

function render(disabledMatchUpStatuses?: string[]) {
  const launch = document.createElement('button');
  launch.textContent = 'Open scoped score entry';
  launch.className = 'button';
  launch.onclick = () => {
    while (document.querySelector(MODAL)) cModal.close();
    openScoreEntryDialog({
      sides: [{ participantName: 'Alice' }, { participantName: 'Bob' }],
      matchUpFormat: 'SET3-S:6/TB7',
      approach: 'freeScore',
      disabledMatchUpStatuses
    });
  };
  return launch;
}

const find = <T extends HTMLElement>(selector: string) => document.querySelector<T>(`${MODAL} ${selector}`)!;

export const RestrictedStatus = {
  render: () => render(['DEAD_RUBBER', 'CHALLENGED']),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('button')!.click();
    try {
      find<HTMLButtonElement>('button[data-action="other"]').click();
      await expect(document.querySelector(DEAD_OPTION)).toBeNull();
      const field = find<HTMLInputElement>('.chc-sec-score-region input');
      field.value = 'dead rubber';
      field.dispatchEvent(new Event('input', { bubbles: true }));
      await expect(find<HTMLButtonElement>(SUBMIT).disabled).toBe(true);
      await expect(find<HTMLElement>('.chc-sec-field-note').textContent).toContain('unavailable');
      field.value = '6-4 6-3';
      field.dispatchEvent(new Event('input', { bubbles: true }));
      await expect(find<HTMLButtonElement>(SUBMIT).disabled).toBe(false);
    } finally {
      cModal.close();
    }
  }
};

export const UnrestrictedStatus = {
  render: () => render([]),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('button')!.click();
    try {
      find<HTMLButtonElement>('button[data-action="other"]').click();
      const dead = find<HTMLButtonElement>(DEAD_OPTION);
      await expect(dead.disabled).toBe(false);
      dead.click();
      await expect(find<HTMLButtonElement>(SUBMIT).disabled).toBe(false);
    } finally {
      cModal.close();
    }
  }
};
