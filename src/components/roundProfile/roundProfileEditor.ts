/**
 * Round-profile editor for a LUCKY_DRAW: one number input per round (matchUps in that round), chained by arrows that
 * carry a "+N LL" badge where the next round takes lucky losers. Moved from TMX's addDraw drawer (2026-11-08) so the
 * topology builder and TMX share it.
 *
 * The default is the ceil-halving cascade for drawSize. Editing a round clamps it into its valid range and re-defaults
 * every later round from it, so changing R2 of drawSize 40 from 10 to 12 gives 20 → 12 → 6 → 3 → 2 → 1. The first round
 * (drawSize / 2) and the final (1) are read-only. An odd drawSize shows a notice and `getProfile()` returns null, since
 * an explicit profile needs an even drawSize — the factory then plays its default cascade.
 *
 * All rules live in `roundProfileLogic.ts`. Labels default to English; a host passes its own translations.
 */
import { validateRoundProfile, type RoundProfileProblem } from './roundProfileLogic';
import { defaultProfile, luckyLosersNeeded, roundRange, sanitizeProfile } from './roundProfileLogic';
import { isRoundProfileEditable, setRound } from './roundProfileLogic';

export type RoundProfileEditorLabels = {
  title?: string;
  subtitle?: string;
  reset?: string;
  evenDrawSizeRequired?: string;
  /** Accessible name of a round's input. */
  roundInput?: (roundNumber: number) => string;
  /** The badge between rounds when the next one takes lucky losers. */
  luckyLosers?: (count: number) => string;
  /** The inline message for a profile the factory would refuse. */
  problem?: (problem: RoundProfileProblem) => string;
};

export type RoundProfileEditorOptions = {
  drawSize: number;
  initialProfile?: number[];
  onChange?: (profile: number[] | null) => void;
  labels?: RoundProfileEditorLabels;
};

export type RoundProfileEditorController = {
  /** Show or hide the entire editor. */
  setVisible(visible: boolean): void;
  /** Update the drawSize and reset to the ceil-halving default. */
  setDrawSize(drawSize: number): void;
  /** Returns the current profile if valid, otherwise null. */
  getProfile(): number[] | null;
  /** Whether the current state passes all constraints. */
  isValid(): boolean;
  /** Remove the editor from the DOM. */
  destroy(): void;
};

export function defaultProblemMessage(problem: RoundProfileProblem): string {
  switch (problem.code) {
    case 'EVEN_DRAW_SIZE_REQUIRED':
      return 'A round profile requires an even draw size.';
    case 'MUST_END_AT_ONE':
      return 'Profile must end at 1.';
    case 'FIRST_ROUND_MISMATCH':
      return `First round × 2 (${problem.firstRoundSlots}) must equal drawSize (${problem.drawSize}).`;
    case 'DROPS_WINNERS':
      return `Round ${problem.round} has only ${problem.slots} slots but round ${problem.round - 1} produces ${problem.winners} winners.`;
    case 'EXCEEDS_PREVIOUS_ROUND':
      return `Round ${problem.round} has ${problem.matchUps} matchUps, more than round ${problem.round - 1} (${problem.previous}).`;
  }
}

const DEFAULT_LABELS: Required<RoundProfileEditorLabels> = {
  title: 'Round profile',
  subtitle: 'matchUps per round',
  reset: 'Reset',
  evenDrawSizeRequired: 'A round profile requires an even draw size.',
  roundInput: (roundNumber) => `Round ${roundNumber} matchUps`,
  luckyLosers: (count) => `+${count} LL`,
  problem: defaultProblemMessage
};

const CLASS_ROOT = 'rpe';
const CLASS_STRIP = 'rpe__strip';
const CLASS_CELL = 'rpe__cell';
const CLASS_CELL_LOCKED = 'rpe__cell--locked';
const CLASS_ARROW = 'rpe__arrow';
const CLASS_LL = 'rpe__ll';
const CLASS_LABEL = 'rpe__label';
const CLASS_ERROR = 'rpe__error';
const CLASS_RESET = 'rpe__reset';
const CLASS_DISABLED = 'rpe--disabled';

export function mountRoundProfileEditor(
  parentEl: HTMLElement,
  options: RoundProfileEditorOptions
): RoundProfileEditorController {
  const labels = { ...DEFAULT_LABELS, ...options.labels };

  const root = document.createElement('div');
  root.className = CLASS_ROOT;
  root.dataset.testid = 'round-profile-editor';

  const labelEl = document.createElement('div');
  labelEl.className = CLASS_LABEL;
  const labelTitle = document.createElement('div');
  labelTitle.textContent = labels.title;
  const labelSub = document.createElement('em');
  labelSub.className = `${CLASS_LABEL}-sub`;
  labelSub.textContent = labels.subtitle;
  labelEl.append(labelTitle, labelSub);
  root.appendChild(labelEl);

  const strip = document.createElement('div');
  strip.className = CLASS_STRIP;
  root.appendChild(strip);

  const errorEl = document.createElement('div');
  errorEl.className = CLASS_ERROR;
  root.appendChild(errorEl);

  const resetBtn = document.createElement('button');
  resetBtn.className = CLASS_RESET;
  resetBtn.type = 'button';
  resetBtn.textContent = labels.reset;
  root.appendChild(resetBtn);

  parentEl.appendChild(root);

  let drawSize = options.drawSize;
  let profile: number[] = options.initialProfile?.length
    ? sanitizeProfile(options.initialProfile, drawSize)
    : defaultProfile(drawSize);

  function render() {
    strip.replaceChildren();
    root.classList.remove(CLASS_DISABLED);

    if (!isRoundProfileEditable(drawSize)) {
      const msg = document.createElement('div');
      msg.textContent = labels.evenDrawSizeRequired;
      strip.appendChild(msg);
      root.classList.add(CLASS_DISABLED);
      hideError();
      return;
    }

    for (let i = 0; i < profile.length; i++) {
      const isLast = i === profile.length - 1;
      const cell = document.createElement('input');
      cell.type = 'number';
      cell.className = CLASS_CELL;
      cell.value = String(profile[i]);
      cell.setAttribute('aria-label', labels.roundInput(i + 1));
      cell.dataset.roundIndex = String(i);

      // R1 is derived from drawSize and the last cell is the locked final: both read-only.
      if (i === 0 || isLast) {
        cell.disabled = true;
        cell.classList.add(CLASS_CELL_LOCKED);
      } else {
        const { min, max } = roundRange(profile[i - 1]);
        cell.min = String(min);
        cell.max = String(max);
        cell.addEventListener('change', () => {
          const parsed = Number.parseInt(cell.value);
          if (Number.isFinite(parsed)) handleCellChange(i, parsed);
        });
      }
      strip.appendChild(cell);

      if (!isLast) {
        const arrow = document.createElement('span');
        arrow.className = CLASS_ARROW;
        const arrowText = document.createElement('span');
        arrowText.textContent = '→';
        arrow.appendChild(arrowText);
        const count = luckyLosersNeeded(profile[i], profile[i + 1]);
        if (count > 0) {
          const badge = document.createElement('span');
          badge.className = CLASS_LL;
          badge.dataset.luckyLosers = String(count);
          badge.textContent = labels.luckyLosers(count);
          arrow.appendChild(badge);
        }
        strip.appendChild(arrow);
      }
    }

    validate();
  }

  function handleCellChange(index: number, value: number) {
    profile = setRound(profile, index, value);
    render();
    fireChange();
  }

  function validate(): boolean {
    if (!isRoundProfileEditable(drawSize)) {
      hideError();
      return false;
    }
    const problem = validateRoundProfile(profile, drawSize);
    if (problem) {
      errorEl.textContent = labels.problem(problem);
      errorEl.style.display = '';
      return false;
    }
    hideError();
    return true;
  }

  function hideError() {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }

  function fireChange() {
    options.onChange?.(validate() ? [...profile] : null);
  }

  resetBtn.addEventListener('click', () => {
    profile = defaultProfile(drawSize);
    render();
    fireChange();
  });

  render();

  return {
    setVisible(visible) {
      root.style.display = visible ? '' : 'none';
    },
    setDrawSize(newSize) {
      if (newSize === drawSize) return;
      drawSize = newSize;
      profile = defaultProfile(drawSize);
      render();
      fireChange();
    },
    getProfile() {
      return validate() ? [...profile] : null;
    },
    isValid() {
      return validate();
    },
    destroy() {
      root.remove();
    }
  };
}
