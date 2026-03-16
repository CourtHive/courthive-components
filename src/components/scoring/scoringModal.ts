/**
 * Modern TypeScript scoring modal
 * Supports multiple scoring approaches with validation
 * Menu caret allows seamless switching between approaches
 */
import { renderDynamicSetsScoreEntry } from './approaches/dynamicSetsApproach';
import { renderDialPadScoreEntry } from './approaches/dialPadApproach';
import { renderFreeScoreEntry } from './approaches/freeScoreApproach';
import type { ScoringModalParams, ScoreOutcome } from './types';
import { getScoringConfig, setScoringConfig } from './config';
import { cModal } from '../modal/cmodal';

type ScoringApproach = 'dynamicSets' | 'freeScore' | 'dialPad';

const APPROACH_LABELS: Record<ScoringApproach, string> = {
  dynamicSets: 'Dynamic Sets',
  freeScore: 'Free Score',
  dialPad: 'Dial Pad'
};

const APPROACHES: ScoringApproach[] = ['dynamicSets', 'freeScore', 'dialPad'];

export function scoringModal(params: ScoringModalParams): void {
  const { matchUp, callback, onClose, labels = {} } = params;

  const config = getScoringConfig();
  let activeApproach: ScoringApproach = (config.scoringApproach as ScoringApproach) || 'dynamicSets';

  // Track if matchUp had an existing score/status
  const hadExistingScore = !!(matchUp.score?.sets?.length || matchUp.matchUpStatus);
  let currentOutcome: ScoreOutcome | null = null;
  let wasCleared = false;

  const handleScoreChange = (outcome: ScoreOutcome) => {
    currentOutcome = outcome;

    if (wasCleared && (outcome.sets?.length > 0 || outcome.score)) {
      wasCleared = false;
    }

    const submitBtn = document.getElementById('submitScoreV2') as HTMLButtonElement;
    if (submitBtn) {
      const canSubmit = outcome.isValid || (wasCleared && hadExistingScore);
      submitBtn.disabled = !canSubmit;
    }

    const clearBtn = document.getElementById('clearScoreV2') as HTMLButtonElement;
    if (clearBtn) {
      const scoreInput = document.getElementById('scoreInputV2') as HTMLInputElement;
      if (scoreInput) {
        clearBtn.disabled = !scoreInput.value.trim();
      } else {
        const hasSets = outcome.sets && outcome.sets.length > 0;
        const hasIrregularStatus =
          outcome.matchUpStatus && outcome.matchUpStatus !== 'COMPLETED' && outcome.matchUpStatus !== 'TO_BE_PLAYED';
        clearBtn.disabled = !(hasSets || hasIrregularStatus);
      }
    }
  };

  const cleanupCurrentApproach = () => {
    if ((window as any).cleanupDialPad) {
      (window as any).cleanupDialPad();
      (window as any).cleanupDialPad = undefined;
    }
    if ((window as any).resetDialPad) {
      (window as any).resetDialPad = undefined;
    }
    if ((window as any).resetDynamicSets) {
      (window as any).resetDynamicSets = undefined;
    }
  };

  const renderApproach = (approach: ScoringApproach): HTMLElement => {
    const container = document.createElement('div');
    container.style.padding = '1em';

    if (approach === 'freeScore') {
      renderFreeScoreEntry({ matchUp, container, onScoreChange: handleScoreChange, labels });
    } else if (approach === 'dynamicSets') {
      renderDynamicSetsScoreEntry({ matchUp, container, onScoreChange: handleScoreChange, labels });
    } else if (approach === 'dialPad') {
      renderDialPadScoreEntry({ matchUp, container, onScoreChange: handleScoreChange, labels });
    }

    return container;
  };

  const freeScoreHelp = `
    <strong>${labels.scoreTips || 'Score Entry Tips:'}</strong><br><br>
    <strong>${labels.setScores || 'Set Scores:'}</strong> Enter space or dash-separated (e.g., "6-4 6-3")<br><br>
    <strong>${
      labels.tiebreaks || 'Tiebreaks:'
    }</strong> Auto-detected from digits (e.g., "67 3" becomes "6-7(3)")<br><br>
    <strong>${labels.matchTiebreaks || 'Match Tiebreaks:'}</strong> Use dash separator (e.g., "10-7")<br><br>
    <strong>${labels.irregularEndings || 'Irregular Endings:'}</strong><br>
    <strong>r</strong> = ${labels.retired || 'Retired'}<br>
    <strong>w</strong> = ${labels.walkover || 'Walkover'}<br>
    <strong>d</strong> = ${labels.defaulted || 'Defaulted'}<br>
    <strong>s</strong> = Suspended<br>
    <strong>c</strong> = Cancelled<br>
    <strong>a</strong> = Awaiting Result<br>
    <strong>in</strong> = In Progress<br>
    <strong>inc</strong> = Incomplete<br>
    <strong>dr</strong> = Dead Rubber
  `;

  const dynamicSetsHelp = `
    <strong>${labels.dynamicSetsTips || 'Dynamic Sets Scoring:'}</strong><br><br>
    Enter scores set by set using individual inputs.<br><br>
    <strong>${labels.addSet || 'Add Set:'}</strong> Click "+" to add another set<br><br>
    <strong>${labels.tiebreaks || 'Tiebreaks:'}</strong> Enter tiebreak score in the TB field when a set is tied<br><br>
    <strong>${
      labels.irregularEndings || 'Irregular Endings:'
    }</strong> Use the status dropdown to set Retired, Walkover, Default, etc.
  `;

  const dialPadHelp = `
    <strong>${labels.dialPadTips || 'Dial Pad Scoring:'}</strong><br><br>
    Tap the number buttons to enter scores for each side.<br><br>
    <strong>${labels.setScores || 'Set Scores:'}</strong> Select a side, then tap the game score<br><br>
    <strong>${labels.tiebreaks || 'Tiebreaks:'}</strong> Enter tiebreak score when prompted<br><br>
    <strong>${
      labels.irregularEndings || 'Irregular Endings:'
    }</strong> Use the status dropdown to set Retired, Walkover, Default, etc.
  `;

  const approachHelp: Record<ScoringApproach, string> = {
    freeScore: freeScoreHelp,
    dynamicSets: dynamicSetsHelp,
    dialPad: dialPadHelp
  };

  const buildMenuItems = () =>
    APPROACHES.map((a) => ({
      label: APPROACH_LABELS[a],
      active: a === activeApproach,
      onClick: () => switchApproach(a)
    }));

  const buildModalConfig = () => ({
    info: approachHelp[activeApproach],
    menu: { menuItems: buildMenuItems() }
  });

  const clearButton = () => {
    // Re-apply clear button styling after content swap
    setTimeout(() => {
      const clearBtn = document.getElementById('clearScoreV2') as HTMLButtonElement;
      if (clearBtn) {
        clearBtn.style.backgroundColor = 'var(--chc-clear-btn-bg)';
        clearBtn.style.color = 'var(--chc-clear-btn-text)';
        if (hadExistingScore) clearBtn.disabled = false;
      }
      if (currentOutcome) handleScoreChange(currentOutcome);
    }, 0);
  };

  let modalHandle: any;

  const switchApproach = (newApproach: ScoringApproach) => {
    if (newApproach === activeApproach) return;

    cleanupCurrentApproach();
    currentOutcome = null;
    wasCleared = false;
    activeApproach = newApproach;

    // Persist the preference
    setScoringConfig({ scoringApproach: newApproach });

    if (modalHandle) {
      modalHandle.update({
        content: renderApproach(newApproach),
        config: buildModalConfig()
      });
      clearButton();
    }
  };

  const makeButtons = () => [
    {
      onClick: () => {
        cleanupCurrentApproach();
      },
      label: labels.cancel || 'Cancel',
      intent: 'none',
      footer: {
        className: 'button',
        style:
          'background-color: var(--chc-bg-primary); color: var(--chc-text-primary); border: 1px solid var(--chc-border-primary);'
      } as any,
      close: true
    },
    {
      id: 'clearScoreV2',
      label: labels.clear || 'Clear',
      intent: 'none',
      disabled: true,
      close: false,
      onClick: () => {
        wasCleared = true;

        if (activeApproach === 'freeScore') {
          const scoreInput = document.getElementById('scoreInputV2') as HTMLInputElement;
          if (scoreInput) {
            scoreInput.value = '';
            scoreInput.dispatchEvent(new Event('input', { bubbles: true }));
            scoreInput.focus();
          }
        } else if (activeApproach === 'dynamicSets' && (window as any).resetDynamicSets) {
          (window as any).resetDynamicSets();
        } else if (activeApproach === 'dialPad' && (window as any).resetDialPad) {
          (window as any).resetDialPad();
        }
      }
    },
    {
      id: 'submitScoreV2',
      label: labels.submit || 'Submit Score',
      intent: 'is-primary',
      disabled: true,
      onClick: () => {
        const canSubmit = currentOutcome && (currentOutcome.isValid || (wasCleared && hadExistingScore));
        if (canSubmit) {
          cleanupCurrentApproach();
          callback(currentOutcome);
        }
      },
      close: true
    }
  ];

  modalHandle = cModal.open({
    title: labels.title || 'Score Entry',
    content: renderApproach(activeApproach),
    config: buildModalConfig(),
    buttons: makeButtons(),
    onClose: onClose ? () => onClose() : undefined
  });

  clearButton();
}
